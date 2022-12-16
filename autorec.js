import { execa } from 'execa';
import Cron from 'croner';

// Set timezone for cronjobs
const timezone = "America/Lima";

// Set up your programs
const programs = [
	// crontab for recording start
	['0 7 * * *', {
		url: 'm3u* or file link', // IPTV/stream link
		name: 'any-name', // name for files
		end: '0 8 * * *', // crontab for recording end
		direct: false // true for endless file download, otherwise false
	}]
];

for (const program of programs) {
	const job = Cron(program[0], { context: program[1], timezone }, record);
	console.log(`${program[1].name} -> ${job.next()}`);
}

console.log(`\n${programs.length} programs ready to be auto-recorded!`);

function record(job, options) {
	if (typeof options.max_retries !== 'number') options.max_retries = 50;
	let retries = 0;
	let pr = write(options);
	const endjob = Cron(options.end, { maxRuns: 1, timezone }, (ej) => {
		pr.removeAllListeners('exit');
		pr.cancel();
		console.log(`\nSTOPPED RECORDING AT ${new Date().toLocaleString()}`);
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
	if (options.direct) command = `wget -q -O '${getName(options.name, new Date())}.ts'${options.referer ? ` --referer='${options.referer}'` : ''}${options.user_agent ? ` --user-agent='${options.user_agent}'` : ''} '${options.url}'`;
	else command = `streamlink${options.proxy ? ` --http-proxy '${options.proxy}'` : ''}${options.referer ? ` --http-header 'referer=${options.referer}'` : ''}${options.user_agent ? ` --http-header 'User-Agent=${options.user_agent}'` : ''} -o '${getName(options.name, new Date())}.ts' '${options.url}' best`;
	console.log(`\n${new Date().toLocaleString()}`);
	console.log(`\n${command}`);
	return execa(command, { shell: '/bin/sh', stdout: process.stdout, stderr: process.stderr, stdin: null });
}

function getName(name, date) {
	return `${name}-${date.getDate()}-${date.getMonth() + 1}_${date.getHours()}-${date.getMinutes()}`
}

console.log('STARTING AUTO-RECORDING');