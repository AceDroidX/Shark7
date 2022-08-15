import { SimpleIntervalJob, Task, ToadScheduler } from 'toad-scheduler';
import { logErrorDetail } from './utils';

export class Scheduler extends ToadScheduler {
    scheduler = new ToadScheduler()
    addJob(id: string, interval: number, handler: () => void) {
        const task = new Task(id, handler, (err: Error) => { logErrorDetail(`${id}错误`, err) })
        this.scheduler.addSimpleIntervalJob(new SimpleIntervalJob({ seconds: interval }, task))
        return task
    }
}
