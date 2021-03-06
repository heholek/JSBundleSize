const core = require("@actions/core");
const exec = require("@actions/exec");
const github = require("@actions/github");

async function run() {
  function bytesToSize(bytes) {
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    if (bytes === 0) return "0 Byte";
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return (bytes / Math.pow(1024, i)).toFixed(2) + " " + sizes[i];
  }
  try {
    // --------------- octokit initialization  ---------------
    const token = core.getInput("token");
    console.log("Initializing oktokit with token", token);
    const octokit = new github.GitHub(token);
    // --------------- End octokit initialization ---------------

    // --------------- Checkout code --------------- //
    // console.log("Checkout code");
    //
    // await exec.exec(
    //   `git clone git@github.com:${github.context.repo.owner}/${
    //     github.context.repo.repo
    //   }`
    // );
    //
    // const refBranch = github.context.ref;
    // console.log("ref", refBranch);
    // const branch = refBranch.split("refs/heads/")[1];
    // await exec.exec(`git checkout ${branch}`);
    //
    // End --------------- Checkout code --------------- //

    // --------------- Build repo  ---------------
    const bootstrap = core.getInput("bootstrap"),
      build_command = core.getInput("build_command"),
      dist_path = core.getInput("dist_path");

    console.log(`Bootstrapping repo`);
    await exec.exec(bootstrap);

    console.log(`Building Changes`);
    await exec.exec(build_command);

    core.setOutput("Building repo completed @ ", new Date().toTimeString());

    // --------------- End Build repo  ---------------

    // --------------- Comment repo size  ---------------
    const outputOptions = {};
    let sizeCalOutput = "";

    outputOptions.listeners = {
      stdout: data => {
        sizeCalOutput += data.toString();
      },
      stderr: data => {
        sizeCalOutput += data.toString();
      }
    };
    await exec.exec(`du ${dist_path}`, null, outputOptions);
    core.setOutput("size", sizeCalOutput);

    const context = github.context,
      pull_request_number = context.payload.pull_request.number;

    const arrayOutput = sizeCalOutput.split("\n");
    let result = "Bundled size for the package is listed below: \n \n";
    arrayOutput.forEach(item => {
      const i = item.split(/(\s+)/);
      if (item) {
        result += `**${i[2]}**: ${bytesToSize(parseInt(i[0]) * 1000)} \n`;
      }
    });

    octokit.issues.createComment(
      Object.assign(Object.assign({}, context.repo), {
        issue_number: pull_request_number,
        body: result
      })
    );

    // --------------- End Comment repo size  ---------------
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
