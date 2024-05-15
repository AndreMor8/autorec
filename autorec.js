import { execa } from "execa";
import Cron from "croner";
import terminate from "terminate/promise.js";

// Set timezone for cronjobs
const timezone = "America/Lima";

//Commands you need to make this work
//Some Windows installations access streamlink custom installs via "python -m streamlink"
//Default is searching them on PATH
const WGET_CMD = "wget";
const STREAMLINK_CMD = "streamlink";

const programs = [];
// Set up your programs, crontab for recording start
programs.push(["0 7 * * *", {
	url: "m3u*/mpd or file link", // IPTV/stream link
	name: "any-name", // name for files
	end: "0 8 * * *", // crontab for recording end
	direct: false, // true for endless file download (wget), otherwise false (streamlink)
	additional: "", //additional command line arguments, like --ffmpeg_dkey on custom streamlink installs
}]);

for (const program of programs) {
	const job = Cron(program[0], { context: program[1], timezone }, record);
	console.log(`${program[1].name} -> ${job.nextRun()}`);
}

console.log(`\n${programs.length} programs ready to be auto-recorded!`);

function record(job, options) {
	if (typeof options.max_retries !== "number") options.max_retries = 50;
	let retries = 0;
	let pr = write(options);
	const endjob = Cron(options.end, { maxRuns: 1, timezone }, () => {
		pr.removeAllListeners("exit");
		terminate(pr.pid, "SIGTERM", { timeout: 120000 }).then(() => {
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
		pr.on("exit", exit);
	}
	pr.on("exit", exit);
}

function write(options) {
	let command;
	if (options.direct) command = `${WGET_CMD} -q -O "${getName(options.name, new Date())}.ts" ${options.additional || ""} "${options.url}"`;
	else command = `${STREAMLINK_CMD} ${options.additional || ""} -o "${getName(options.name, new Date())}.ts" "${options.url}" best`;
	console.log(`\n${new Date().toLocaleString()}`);
	console.log(`\n${command}`);
	return execa({ shell: true, cleanup: false })(command);
}

function getName(name, date) {
	return `${name}-${date.getDate()}-${date.getMonth() + 1}_${date.getHours()}-${date.getMinutes()}`
}

//TO-DO: Make this "bulletproof" to SIGTERM/SIGINT as bulkrec.js so it can handle and terminate processes correctly

console.log("STARTING AUTO-RECORDING");
