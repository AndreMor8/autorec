import { execa } from 'execa';
import cron from 'croner';
import exitHook from 'async-exit-hook';

const program = {
    name: 'any-name', // name for files
    cutloop: '? * * * *', // this cronjob will cut the recording of the stream and start recording again, useful for not having 1 giant file.
    url: 'm3u* or file link', // IPTV/stream link
    additional: ``, // additional command line arguments
    direct: false // true for endless file download, otherwise false
}

let acp = null;

function record() {
    let command;
    if (program.direct) command = `wget -q -O '${getName(program.name, new Date())}.ts' ${program.additional || ''} "${program.url}"`;
    else command = `streamlink ${program.additional || ''} -o '${getName(program.name, new Date())}.ts' '${program.url}' best`;
    console.log(`${command}\n`);
    const pr = execa(command, { shell: '/bin/sh', stdout: process.stdout, stderr: process.stderr, stdin: null, cleanup: false });
    pr.on('exit', () => {
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

cron(program.cutloop, () => {
    console.log("\nCLOSING STREAM!\n");
    acp.kill("SIGTERM", { forceKillAfterTimeout: false });
});

exitHook((done) => {
    acp.removeAllListeners('exit');
    console.log("\nEXITING APP!\n");
    acp.then(() => {
        done();
    });
    acp.kill("SIGTERM", { forceKillAfterTimeout: false });
});