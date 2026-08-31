import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers';
import weeklyPrompt from '../../ai/prompts/weekly-report.md?raw';
import { createProviders } from '../../ai/providers';
import { weeklyNarrativeSchema } from '../../shared/schemas';

interface Params { weekStart:string; weekEnd:string; }
interface ReviewMetrics { reviews:number; accuracy:number|null; avgResponseMs:number|null; }
interface SessionMetrics { sessions:number; speakingMinutes:number|null; }
interface ErrorMetric { category:string; count_30d:number; }
interface TransferMetrics { units:number; events:number; }

export class WeeklyReportWorkflow extends WorkflowEntrypoint<Env,Params>{
  async run(event:WorkflowEvent<Params>,step:WorkflowStep){
    const {weekStart,weekEnd}=event.payload;
    const metrics=await step.do('compute objective weekly metrics',async()=>{
      const review=await this.env.DB.prepare(`SELECT COUNT(*) reviews,AVG(correct) accuracy,AVG(response_ms) avgResponseMs FROM review_events WHERE reviewed_at>=? AND reviewed_at<?`).bind(weekStart,weekEnd).first<ReviewMetrics>();
      const sessions=await this.env.DB.prepare(`SELECT COUNT(*) sessions,SUM(duration_seconds)/60.0 speakingMinutes FROM practice_sessions WHERE started_at>=? AND started_at<?`).bind(weekStart,weekEnd).first<SessionMetrics>();
      const errors=await this.env.DB.prepare(`SELECT category,COUNT(*) count_30d FROM feedback_items WHERE last_seen_at>=datetime(?,'-30 days') AND last_seen_at<? GROUP BY category ORDER BY count_30d DESC LIMIT 3`).bind(weekEnd,weekEnd).all<ErrorMetric>();
      const transfer=await this.env.DB.prepare(`SELECT COUNT(DISTINCT unit_id) units,COUNT(*) events FROM learning_evidence WHERE dimension='transfer' AND score>=65 AND created_at>=? AND created_at<?`).bind(weekStart,weekEnd).first<TransferMetrics>();
      return{review,sessions,errors:errors.results,transfer};
    });
    const narrative=await step.do('interpret weekly metrics',{retries:{limit:2,delay:'10 seconds',backoff:'exponential'}},async()=>createProviders(this.env).text.generateStructured({taskType:'weekly_report',system:weeklyPrompt,prompt:JSON.stringify(metrics),modelRole:'evaluator_strong',sensitive:true},weeklyNarrativeSchema));
    await step.do('store idempotent weekly report',async()=>{const id=`report-${weekStart}`;await this.env.DB.prepare(`INSERT INTO weekly_reports(id,user_id,week_start,week_end,metrics_json,narrative_json,next_week_plan_json) VALUES(?,'primary',?,?,?,?,?) ON CONFLICT(user_id,week_start) DO UPDATE SET metrics_json=excluded.metrics_json,narrative_json=excluded.narrative_json,next_week_plan_json=excluded.next_week_plan_json`).bind(id,weekStart,weekEnd,JSON.stringify(metrics),JSON.stringify(narrative),JSON.stringify({focus:narrative.nextWeek})).run();return{id};});
    return{weekStart,status:'complete'};
  }
}
