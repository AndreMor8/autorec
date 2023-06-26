import { execa, execaSync } from 'execa';
import fs from 'fs/promises';
import cron from 'croner';
import exitHook from 'async-exit-hook';
import terminate from 'terminate/promise.js';

const program = {
    name: 'any-name', // name for files
    cutloop: '? * * * *', // this cronjob will cut the recording of the stream and start recording again, useful for not having 1 giant file.
    url: 'm3u*/mpd or file link', // IPTV/stream link
    additional: "", // additional command line arguments
    direct: false, // true for endless file download, otherwise false,
    keys: [] //only drm streams, uses N_m3u8DL-RE
}

let acp = null;
let drm_filename = null;

function record() {
    let command;
    if (program.keys?.length) {
		if(drm_filename) {
			fs.rm(`./${drm_filename}`, { recursive: true }).then(() => console.log("Previous temporal data has been deleted...")).catch(console.error);
		}
		drm_filename = getName(program.name, new Date());
		command = `N_m3u8DL-RE ${program.url} -M mp4 -mt --no-log --check-segments-count false ${program.additional || ''} -sv best -ss all --save-name "${drm_filename}" --binary-merge --live-real-time-merge --live-pipe-mux --use-shaka-packager ${program.keys.map(e => "--key " + e).join(" ")}`;	
	} else {
		if (program.direct) command = `wget -q -O '${getName(program.name, new Date())}.ts' ${program.additional || ''} "${program.url}"`;
		else command = `streamlink ${program.additional || ''} -o '${getName(program.name, new Date())}.ts' '${program.url}' best`;	
	}
    
    console.log(`${command}\n`);
    const pr = execa(command, { shell: '/bin/sh', cleanup: false });
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

cron(program.cutloop, async () => {
    await terminate(acp.pid, 'SIGTERM', { timeout: 60000 });
	console.log("\nPREVIOUS STREAM CLOSED!\n");
});

exitHook((done) => {
    acp.removeAllListeners('exit');
    console.log("\nEXITING APP!\n");
    acp.then(() => {
        done();
    });
    terminate(acp.pid, 'SIGTERM', { timeout: 60000 });
});
