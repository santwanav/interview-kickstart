const models = require('../models/models.js');
const utility = require('../utility/utility.js');
const dbsvc = require('./database_service.js');
const scsvc = require('./slot_cache_service.js');

function FrontendService(ds) {
    this.ds = ds;
}

FrontendService.prototype.init = async function() {
    this.interviewers = await this.ds.get_interviewers();
    this.slot_caches = new Map();
    for (let interviewer of this.interviewers) {
        this.slot_caches.set(interviewer.id, new scsvc.SlotCacheService(interviewer, this.ds));
    }
};

// check_slot(student: Student) : { err: string, slots: object (InterviewerId -> [Slot])}
FrontendService.prototype.check_slot = async function(student) {
    let scores = await this.ds.get_last_scores(student, 2);
    for (let score of scores) {
        if (score <= 1) {
            return { err: "Scores are too low to interview" };
        }
    }

    let poss_int = await this.ds.get_possible_interviewers(student);
    if (poss_int.length == 0) return { err: "No interviewers available (15+ interviews done or ran out of interviewers)." };
    let slots = {};
    let toCheckSlot = new models.Slot(utility.currTime(), 1000000000000000);
    for (let int of poss_int) {
        slots[int.id] = await this.slot_caches.get(int.id).check_slot(toCheckSlot);
    }
    return { err: null, slots };
};

// submit_avail(interviewer: Interviewer, avail: [Slot]) : void
FrontendService.prototype.submit_avail = async function(interviewer, avail) {
    interviewer.avail = avail;
    for (let slot of avail) {
        await this.ds.add_free_slot(interviewer, slot);
    }
};

// add_interview(interview: Interview) : void
// TODO: add method to update score
FrontendService.prototype.add_interview = async function(interview) {
    await this.ds.add_interview(interview);
};

(async () => {
    const d = new dbsvc.DatabaseService();
    await d.init();
    await d.add_dummy_data();
    let is = await d.get_interviewers();
    let ss = await d.get_students();
    const fe = new FrontendService(d);
    await fe.init();
    await fe.submit_avail(is[0],
                          [new models.Slot(utility.strToDate('2021-06-05T13:00:00'), utility.strToDate('2021-06-06T17:00:00'))]);
    // console.log(await d.get_all_slots(utility.strToDate('2021-06-05T14:00:00'), is[0]));
    await fe.add_interview(
        new models.Interview(ss[0], is[0],
                             new models.Slot(utility.strToDate('2021-06-05T14:00:00'), utility.strToDate('2021-06-05T15:00:00')), 3));
    // console.log(await d.get_possible_interviewers(ss[0]));
    // console.log(await d.get_scheduled_interviews(0, is[0]));
    // console.log(await d.get_last_scores(ss[0], 2));
    // console.log((await fe.check_slot(ss[0])).slots);
    // console.log((await fe.check_slot(ss[1])).slots);
})();
