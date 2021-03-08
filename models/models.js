module.exports.Student = class Student {
    constructor(name, id) {
        this.name = name;
        this.id = id;
    }
};

module.exports.Slot = class Slot {
    constructor(startTime, endTime) {
        if (startTime >= endTime) {
            console.error("Not possible to create this slot");
        }
        this.startTime = startTime;
        this.endTime = endTime;
    }
};

module.exports.Interviewer = class Interviewer {
    constructor(name, id, avail) {
        this.name = name;
        this.id = id;
        this.avail = [];
        if (avail != null) {
            this.avail = avail;
        }
    }
};

module.exports.Interview = class Interview {
    constructor(student, interviewer, slot, score) {
        this.student = student;
        this.interviewer = interviewer;
        this.slot = slot;
        this.score = score;
    }
};
