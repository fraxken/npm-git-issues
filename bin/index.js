#!/usr/bin/env node

// Require Third-party Dependencies
const got = require("got");
const octokit = require("@octokit/rest")({
    timeout: 0,
    headers: {
        accept: "application/vnd.github.v3+json",
        "user-agent": "octokit/rest.js v1.2.3"
    }
});

// 1. Retrieve npm project name
const [npmProjectName] = process.argv.slice(2);
if (typeof npmProjectName !== "string") {
    throw new TypeError("Argv[2] (npmProjectName) argument should be a string!");
}

async function main() {
    let payload;

    // Search for npm package in npm registry
    try {
        const response = await got(`https://registry.npmjs.org/${npmProjectName}`);
        payload = JSON.parse(response.body);
        if (payload.error) {
            throw new Error(payload.error);
        }
    }
    catch (error) {
        console.error(error.message);
        console.error(`Unable to found npm package with name ${npmProjectName}`);
        process.exit(0);
    }

    const [,,, org, project] = payload.bugs.url.split("/");
    try {
        const rawResult = await octokit.search.issues({
            q: `repo:${org}/${project} is:issue is:open`,
            sort: "updated",
            order: "desc"
        });

        const issues = rawResult.data.items.map((row) => {
            return {
                title: row.title,
                url: row.url,
                author: row.user.login
            };
        });
        console.log(issues);
    }
    catch (error) {
        console.error(`Failed to found issues on reposity: ${org}/${project}`);
        process.exit(0);
    }
}
main().catch(console.error);
