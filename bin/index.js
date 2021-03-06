#!/usr/bin/env node

// Require Third-party Dependencies
const got = require("got");
const kleur = require("kleur");
const program = require("commander");
const asTable = require("as-table");
const octokit = require("@octokit/rest")({
    timeout: 0,
    userAgent: "octokit/rest.js v1.2.3"
});

/**
 * @typedef {Object} issue
 * @property {String} title
 * @property {String} url
 * @property {Number} id
 * @property {String} author
 * @property {Object[]} labels
 */

function titleToRegex(val) {
    return typeof val === "string" ? new RegExp(val, "g") : /.*/g;
}

// Parse argv commands
program
    .version("0.1.0", "-v, --version")
    .option("-t, --title [value]", "Title regex (default equal to .*)", titleToRegex)
    .option("-l, --labels", "Enable Labels in issues output")
    .option("-a, --auth [value]", "GitHub token")
    .parse(process.argv);

const { title: matchTitle = /.*/g, labels = false, token } = program;
if (typeof token === "string") {
    octokit.authenticate({ type: "token", token });
}

/**
 * @async
 * @function findNPMPackageInRegistry
 * @desc Find a given package in the npm registery
 * @param {!String} npmProjectName npm project name
 * @returns {Promise<any>}
 *
 * @throws {TypeError}
 */
async function findNPMPackageInRegistry(npmProjectName) {
    if (typeof npmProjectName !== "string") {
        throw new TypeError("npmProjectName argument should be a string!");
    }

    const response = await got(`https://registry.npmjs.org/${npmProjectName}`);
    const payload = JSON.parse(response.body);
    if (payload.error) {
        throw new Error(payload.error);
    }

    return payload;
}

/**
 * @function printIssues
 * @desc Print all issues in the terminal
 * @param {issue[]} issues github issues
 * @returns {void}
 */
function printIssues(issues) {
    console.log("");
    const data = [];
    for (const { author, title, url } of issues) {
        if (!matchTitle.test(title)) {
            continue;
        }
        data.push({
            author: kleur.yellow(author),
            title: title.length < 50 ? title : `${title.substr(0, 50)}...`,
            url: kleur.cyan(url)
        });
        // if (labels) {
        //     for (const label of [...issue.labels]) {
        //         process.stdout.write(label.name);
        //     }
        //     if (issue.labels.size > 0) {
        //         process.stdout.write("\n");
        //     }
        // }
    }
    console.log(asTable(data));
}

/**
 * @async
 * @function main
 * @returns {Promise<void>}
 */
async function main() {
    const payload = await findNPMPackageInRegistry(process.argv[2]);
    const [,,, org, project] = payload.bugs.url.split("/");

    try {
        const rawResult = await octokit.search.issuesAndPullRequests({
            q: `repo:${org}/${project} is:issue is:open`,
            sort: "updated",
            order: "desc"
        });

        // Print issues (filtered)
        printIssues(rawResult.data.items.map((row) => {
            return {
                id: row.id,
                title: row.title,
                url: row.url,
                labels: new Set(row.labels.map((label) => {
                    return { name: label.name, color: label.color };
                })),
                author: row.user.login
            };
        }));
    }
    catch (error) {
        console.error(error.message);
        console.error(`Failed to found issues on reposity: ${org}/${project}`);
        process.exit(0);
    }
}
main().catch((error) => {
    console.error(error.message);
    process.exit(0);
});
