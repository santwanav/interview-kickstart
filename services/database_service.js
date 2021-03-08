const models = require('../models/models.js');
const sqlite3 = require('sqlite3').verbose();
const sqlite = require('sqlite');
const utility = require('../utility/utility.js');

// Make the database in memory for now, we can switch to a persistent,
// production DB when done prototyping.

function DatabaseService() {
};

DatabaseService.prototype.init = async function() {
    this.update_token = 0;
    let dbName = '/tmp/mDb.' + Date.now() + '.db';
    this.db = await sqlite.open({ filename: dbName, driver: sqlite3.Database });
    console.log(dbName);
    const db = this.db;
    await db.exec('create table interviewer ( name text, id integer primary key);');
    await db.exec('create table student ( name text, id integer primary key);');
    await db.exec(`create table free_slots (
              start integer not null,
              end integer not null,
              interviewer_id integer not null,
              foreign key (interviewer_id) references interviewer(id),
              primary key (start, end, interviewer_id));`);
    await db.exec(`create table interview (
                 start integer not null,
                 end integer not null,
                 interviewer_id integer not null,
                 student_id integer not null,
                 score integer not null,
                 foreign key (interviewer_id) references interviewer(id),
                 foreign key (student_id) references student,
                 primary key (start, student_id, interviewer_id));`);
};

DatabaseService.prototype.get_update_token = function() {
    return this.update_token;
};

// Just for testing
DatabaseService.prototype.add_dummy_data = async function() {
    this.update_token++;
    // Add a couple of dummy interviewers and stuff since we don't have an API
    // for that.
    const db = this.db;
    let stmt = await db.prepare("INSERT INTO interviewer (name) VALUES (?)");
    stmt.run("Ram");
    stmt.run("Shyam");
    stmt.run("Veer");
    await stmt.finalize();

    stmt = await db.prepare("INSERT INTO student (name) VALUES (?)");
    stmt.run("John");
    stmt.run("James");
    stmt.run("Hams");
    await stmt.finalize();
};


// Addition
DatabaseService.prototype.add_free_slot = async function(i, s) {
    this.update_token++;
    await this.db.run('INSERT INTO free_slots values (?, ?, ?)',
                      [s.startTime, s.endTime, i.id]);
};

DatabaseService.prototype.add_interview = async function(i) {
    this.update_token++;
    await this.db.run('INSERT INTO interview values (?, ?, ?, ?, ?)',
                      [i.slot.startTime, i.slot.endTime, i.interviewer.id, i.student.id, i.score]);
};


// Query
// TODO: cache some of these functions based on update_token
DatabaseService.prototype.get_interviewers = async function() {
    let interviewers = [];
    await this.db.each('SELECT * from interviewer', [], (err, row) => {
        if (err) throw err;
        interviewers.push(new models.Interviewer(row.name, row.id, null));
    });
    return interviewers;
};

DatabaseService.prototype.get_students = async function() {
    let ret = [];
    await this.db.each('SELECT * from student', [], (err, row) => {
        if (err) throw err;
        ret.push(new models.Student(row.name, row.id));
    });
    return ret;
};

DatabaseService.prototype.get_student_by_id = async function(sid) {
    let student = null;
    await this.db.each('SELECT * from student where id = ? limit 1', [sid], (err, row) => {
        if (err) throw err;
        student = new models.Student(row.name, row.id);
    });
    return student;
};

DatabaseService.prototype.get_all_slots = async function(time, interviewer) {
    let ret = [];
    await this.db.each('SELECT * from free_slots f WHERE f.interviewer_id = ? AND f.start > ?',
                       [interviewer.id, time], (err, row) => {
                           if (err) throw err;
                           ret.push(new models.Slot(row.start, row.end));
    });
    return ret;
};

DatabaseService.prototype.get_possible_interviewers = async function(student) {
    let interviewers = await this.get_interviewers();
    let already_done = new Set();
    await this.db.each('select interviewer_id from interview i where i.student_id = ?', [ student.id ], (err, row) => {
        if (err) throw err;
        already_done.add(row.interviewer_id);
    });
    if (already_done.size >= 15) return [];
    return interviewers.filter(x => !already_done.has(x.id));
};

DatabaseService.prototype.get_scheduled_interviews = async function(time, interviewer) {
    let interviews = [];
    let rows = await this.db.all('select * from interview i where i.interviewer_id = ? and i.start >= ?',
                      [ interviewer.id, time ]);

    for (let row of rows) {
        let student = await this.get_student_by_id(row.student_id);
        interviews.push(new models.Interview(student, interviewer, new models.Slot(row.start, row.end), row.score));
    }
    return interviews;
};

DatabaseService.prototype.get_last_scores = async function(student, k) {
    let scores = [];
    await this.db.each('select score from interview where student_id = ? order by start desc limit ?',
                       [student.id, k], (err, row) => {
                           scores.push(row.score);
                       });
    return scores;
};

const d = new DatabaseService();
(async () => {
    await d.init();
    await d.add_dummy_data();
    let is = await d.get_interviewers();
    let ss = await d.get_students();
    await d.add_free_slot(is[0], new models.Slot(utility.strToDate('2020-06-05T13:00:00'), utility.strToDate('2020-06-05T17:00:00')));
    console.log(await d.get_all_slots(utility.strToDate('2020-06-05T11:00:00'), is[0]));
    await d.add_interview(new models.Interview(ss[0], is[0], new models.Slot(0, 10), 1));
    await d.add_interview(new models.Interview(ss[0], is[1], new models.Slot(20, 30), 5));
    await d.add_interview(new models.Interview(ss[0], is[2], new models.Slot(40, 90), 3));
    console.log(await d.get_possible_interviewers(ss[0]));
    console.log(await d.get_scheduled_interviews(0, is[0]));
    console.log(await d.get_last_scores(ss[0], 2));
});

module.exports.DatabaseService = DatabaseService;
