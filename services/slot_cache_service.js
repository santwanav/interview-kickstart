const models = require('../models/models.js');
const utility = require('../utility/utility.js');
const dbsvc = require('./database_service.js');
const bounds = require('binary-search-bounds');

function SlotCacheService(interviewer, ds) {
    this.update_token = 0;
    this.interviewer = interviewer;
    this.avail_list = [];
    this.ds = ds;
}

SlotCacheService.prototype.check_slot = async function(slot) {
    // Return a list of slots which are feasible for this interviewer.
    await this.update_cache();
    let startIdx = bounds.le(this.avail_list, slot, utility.slotCmp);
    if (startIdx == -1) startIdx = 0;
    let ret = [];
    for (; startIdx < this.avail_list.length && startIdx >= 0; startIdx++) {
        console.log(this.interviewer);
        console.log(this.avail_list);
        console.log(slot);
        let fs = this.avail_list[startIdx];
        if (fs.endTime < slot.startTime) break;
        ret.push(new models.Slot(
            Math.max(fs.startTime, slot.startTime),
            Math.min(fs.endTime, slot.endTime)
        ));
    }
    console.log(ret);
    return ret;
};

SlotCacheService.prototype.update_cache = async function() {
    // Update the internal data structure we are using to store intervals.
    if (this.ds.get_update_token() == this.update_token) return;
    const currTime = utility.currTime();
    let total_slots = await this.ds.get_all_slots(currTime, this.interviewer);
    total_slots.sort(utility.slotCmp);
    let sched_slots = await this.ds.get_scheduled_interviews(currTime, this.interviewer);
    sched_slots = sched_slots.map((i) => i.slot);
    sched_slots.sort(utility.slotCmp);
    // console.log(total_slots);
    // console.log(sched_slots);
    // Assumption: all sched slots are fully contained inside one slot of total_slots.
    let idxT = 0;
    let idxS = 0;
    for (; idxS < sched_slots.length; idxS++) {
        let ss = sched_slots[idxS];
        let flag = false;
        for (; idxT < total_slots.length && !flag; idxT++) {
            let ts = total_slots[idxT];
            if (ts.startTime > ss.startTime) {
                continue;
            }
            if (ts.endTime < ss.endTime) {
                console.error("This should never happen");
                continue;
            }
            flag = true;
            // Find exactly how we will split it.
            if (ts.startTime == ss.startTime && ts.endTime == ss.endTime) {
                // remove
                total_slots.splice(idxT, 1);
                idxT--;
            } else if (ts.startTime == ss.startTime || ts.endTime == ss.endTime) {
                // change in place
                total_slots[idxT].startTime = Math.max(ss.startTime, ts.startTime);
                total_slots[idxT].endTime = Math.min(ss.startTime, ts.startTime);
            } else {
                // change in place and add
                let et = ts.endTime;
                total_slots[idxT].endTime = ss.startTime;
                total_slots.splice(idxT + 1, 0, new models.Slot(ss.endTime, et));
                idxT++;
            }
        }
        if (!flag) {
            console.error("This should never happen");
        }
    }
    // console.log(total_slots);
    // console.log(sched_slots);
    this.avail_list = total_slots;
};

module.exports.SlotCacheService = SlotCacheService;

/*
(async () => {
    const d = new dbsvc.DatabaseService();
    await d.init();
    await d.add_dummy_data();
    let is = await d.get_interviewers();
    let ss = await d.get_students();
    await d.add_free_slot(is[0], new models.Slot(utility.strToDate('2021-06-05T13:00:00'), utility.strToDate('2021-06-06T17:00:00')));
    // console.log(await d.get_all_slots(utility.strToDate('2021-06-05T14:00:00'), is[0]));
    await d.add_interview(
        new models.Interview(ss[0], is[0],
                             new models.Slot(utility.strToDate('2021-06-05T14:00:00'), utility.strToDate('2021-06-05T15:00:00')), 1));
    // console.log(await d.get_possible_interviewers(ss[0]));
    // console.log(await d.get_scheduled_interviews(0, is[0]));
    // console.log(await d.get_last_scores(ss[0], 2));
    const s = new SlotCacheService(is[0], d);
    console.log(await s.check_slot(new models.Slot(
        utility.strToDate('2021-06-05T13:00:00'),
        utility.strToDate('2021-06-05T19:00:00')
    )));
})();
*/
