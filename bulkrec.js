import { execa } from "execa";
import cron from "croner";
import exitHook from "async-exit-hook";
import terminate from "terminate/promise.js";

//Commands you need to make this work
//Some Windows installations access streamlink custom installs via "python -m streamlink"
//Default is searching them on PATH
const WGET_CMD = "wget";
const STREAMLINK_CMD = "streamlink";

//Set up your program
const program = {
    name: "any-name", // name for files
    cutloop: "? * * * *", // this cronjob will cut the recording of the stream and start recording again, useful for not having 1 giant file.
    url: "m3u*/mpd or file link", // IPTV/stream link
    additional: "", // additional command line arguments
    direct: false, // true for endless file download, otherwise false
}

let acp = null;

function record() {
    let command;
    if (program.direct) command = `${WGET_CMD} -q -O "${getName(program.name, new Date())}.ts" ${program.additional || ""} "${program.url}"`;
    else command = `${STREAMLINK_CMD} ${program.additional || ""} -o "${getName(program.name, new Date())}.ts" "${program.url}" best`;
    console.log(`${command}\n`);
    const pr = execa({ shell: true, cleanup: false })(command);
    pr.on("exit", () => {
        console.log("\nNEXT RECORD! ;)\n");
        acp = record();
    });
    return pr;
}

function getName(name, date) {
    return `${name}-${date.getDate()}-${date.getMonth() + 1}_${date.getHours()}-${date.getMinutes()}`
}

console.log("START RECORDING\n");

acp = record();

const loopjob = cron(program.cutloop, async () => {
    await terminate(acp.pid, "SIGTERM", { timeout: 120000 });
    console.log("\nPREVIOUS STREAM CLOSED!\n");
});

//I"m a Ctrl + C spammer, so this must help
let exited = false;

//I don't think it's so bulletproof but at least if people know how to treat things well, it should help them avoid unfinished processes
exitHook((done) => {
    if (!exited) {
        exited = true;
        loopjob.stop();
        acp.removeAllListeners("exit");
        console.log("\nEXITING APP! Please wait...\n");
        acp.then(() => {
            done();
        });
        terminate(acp.pid, "SIGTERM", { timeout: 120000 });
    }
});
