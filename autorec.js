import { execa } from 'execa';
import Cron from 'croner';
import terminate from 'terminate/promise.js';

// Set timezone for cronjobs
const timezone = "America/Lima";

// Set up your programs
const programs = [
	// crontab for recording start
	['0 7 * * *', {
		url: 'm3u*/mpd or file link', // IPTV/stream link
		name: 'any-name', // name for files
		end: '0 8 * * *', // crontab for recording end
		direct: false, // true for endless file download, otherwise false,
		additional: "", //additional command line arguments
		keys: [] //only drm streams, uses N_m3u8DL-RE
	}]
];

for (const program of programs) {
	const job = Cron(program[0], { context: program[1], timezone }, record);
	console.log(`${program[1].name} -> ${job.nextRun()}`);
}

console.log(`\n${programs.length} programs ready to be auto-recorded!`);

function record(job, options) {
	if (typeof options.max_retries !== 'number') options.max_retries = 50;
	let retries = 0;
	let pr = write(options);
	const endjob = Cron(options.end, { maxRuns: 1, timezone }, (ej) => {
		pr.removeAllListeners('exit');
		terminate(pr.pid, "SIGTERM", { timeout: 60000 }).then(() => {
			console.log(`\nSTOPPED RECORDING AT ${new Date().toLocaleString()}`);
		});
	});
	function exit() {
		if (retries >= options.max_retries) {
			console.log(`\nMAX TRIES REACHED (${options.max_retries}), STOPPING CRONJOB...`);
			endjob.stop();
			job.stop();
			return;
		};
		retries++;
		console.log(`\nRECORDING STOPPED FROM ORIGIN, RETRYING... TRY ${retries}`);
		pr = write(options);
		pr.on('exit', exit);
	}
	pr.on('exit', exit);
}

function write(options) {
	let command;
	if(options.keys?.length) {
		command = `N_m3u8DL-RE ${options.url} -M mp4 -mt --no-log --check-segments-count false ${options.additional || ''} -sv best -ss all --save-name "${getName(options.name, new Date())}" --binary-merge --live-real-time-merge --live-pipe-mux --use-shaka-packager ${options.keys.map(e => "--key " + e).join(" ")}`;
	} else {
		if (options.direct) command = `wget -q -O '${getName(options.name, new Date())}.ts' ${options.additional || ''} '${options.url}'`;
		else command = `streamlink ${options.additional || ''} -o '${getName(options.name, new Date())}.ts' '${options.url}' best`;	
	}
	console.log(`\n${new Date().toLocaleString()}`);
	console.log(`\n${command}`);
	return execa(command, { shell: '/bin/sh', cleanup: false });
}

function getName(name, date) {
	return `${name}-${date.getDate()}-${date.getMonth() + 1}_${date.getHours()}-${date.getMinutes()}`
}

console.log('STARTING AUTO-RECORDING');
