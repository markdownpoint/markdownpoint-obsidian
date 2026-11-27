#!/usr/bin/env node

/*
 * MarkdownPoint - Plugin for Obsidian
 * Copyright (c) 2026 Johan Sanneblad
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { execFileSync, execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { hasNotes, readReleaseNotes, releaseDatePattern, releaseNotesPath } from './read-release-notes.js';

// One level up, because this script lives in scripts/ while every path it touches, and the
// working directory every git command needs, is the repository root
const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
// "current" publishes the version already in the files when it has never been tagged, such as the first release.
// "nightly" publishes the newest release notes as the next patch when they are untagged, finishes a release that
// GitHub's public repository is missing, and otherwise does nothing
const releaseTypes = new Set(['current', 'patch', 'minor', 'major', 'nightly']);
const versionFiles = ['manifest.json', 'package.json', 'package-lock.json', 'versions.json'];
// version-bump.mjs writes the release day into the released entry, so a release commit carries this file unless the entry had that day
const releaseNotesFile = 'src/release-notes.ts';
// origin is the working repository, which every session pushes to. GitHub's public repository takes each release
// as one commit on its main, holding the release tag's files, with a tag of its own on that commit, so the working
// repository's history never reaches it. It is reached by its URL rather than as a remote, and its main is fetched
// without its tags, whose names are the working repository's tags' names on other commits
const workingRepository = 'markdownpoint/markdownpoint-obsidian-dev';
const publicRepository = 'markdownpoint/markdownpoint-obsidian';
const publicUrl = `https://github.com/${publicRepository}.git`;

function git(args, options = {}) {
    return execFileSync('git', args, {
        cwd: projectRoot,
        encoding: 'utf8',
        input: options.input,
        stdio: options.capture ? [options.input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'] : 'inherit'
    })?.trim();
}

// A question git answers with its exit, such as merge-base --is-ancestor
function gitSucceeds(args) {
    try {
        git(args, { capture: true });
        return true;
    } catch {
        return false;
    }
}

// npm is a .cmd script on Windows, which only a shell starts. The arguments are fixed words, so joining them is safe
function npm(args) {
    execSync(['npm', ...args].join(' '), { cwd: projectRoot, stdio: 'inherit' });
}

function readJson(filename) {
    return JSON.parse(readFileSync(join(projectRoot, filename), 'utf8'));
}

function nextVersion(version, releaseType) {
    if (releaseType === 'current') return version;

    const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
    if (!match) throw new Error(`Invalid version in package.json: ${version}`);

    const [, majorText, minorText, patchText] = match;
    const major = Number(majorText);
    const minor = Number(minorText);
    const patch = Number(patchText);

    if (releaseType === 'major') return `${major + 1}.0.0`;
    if (releaseType === 'minor') return `${major}.${minor + 1}.0`;
    return `${major}.${minor}.${patch + 1}`;
}

function assertVersionFields(expectedVersion) {
    const manifest = readJson('manifest.json');
    const packageJson = readJson('package.json');
    const packageLock = readJson('package-lock.json');

    if (
        manifest.version !== expectedVersion ||
        packageJson.version !== expectedVersion ||
        packageLock.version !== expectedVersion ||
        packageLock.packages?.['']?.version !== expectedVersion
    ) {
        throw new Error('Version fields do not agree across manifest.json, package.json and package-lock.json');
    }
}

function assertReleaseNotes(version) {
    if (!readReleaseNotes().some(release => release.version === version)) {
        throw new Error(`${releaseNotesFile} has no entry for ${version}`);
    }
}

// version-bump.mjs writes the release day only into a date right after the version, checked here before npm version
// changes any file
function assertReleaseDate(version) {
    if (!releaseDatePattern(version).test(readFileSync(releaseNotesPath, 'utf8'))) {
        throw new Error(`The ${version} entry in ${releaseNotesFile} needs its date right after its version`);
    }
}

// Only the version being released must map to the current minimum: earlier entries keep the minimum they shipped with
function assertCompatibility(version) {
    const { minAppVersion } = readJson('manifest.json');
    if (readJson('versions.json')[version] !== minAppVersion) {
        throw new Error(`versions.json does not map ${version} to Obsidian ${minAppVersion}`);
    }
}

function assertCleanMain() {
    if (git(['branch', '--show-current'], { capture: true }) !== 'main') {
        throw new Error('Releases must run from the main branch');
    }

    if (git(['status', '--porcelain'], { capture: true })) {
        throw new Error('The worktree must be clean before releasing');
    }

    git(['remote', 'get-url', 'origin'], { capture: true });
    git(['fetch', 'origin', 'main', '--tags'], { capture: true });

    const local = git(['rev-parse', 'HEAD'], { capture: true });
    const remote = git(['rev-parse', 'origin/main'], { capture: true });
    if (local !== remote) throw new Error('Local main must match origin/main before releasing');
}

function remoteTag(remote, version) {
    return Boolean(git(['ls-remote', '--tags', remote, `refs/tags/${version}`], { capture: true }));
}

function isTagged(version) {
    if (git(['tag', '--list', version], { capture: true })) return true;
    return remoteTag('origin', version);
}

// Whether every URL the remote `remote` fetches from and pushes to, as git rewrites them, is the GitHub repository
// `repository`, over https or ssh: a push URL of its own, or one on another host, would take the release elsewhere
function names(remote, repository) {
    const repositoryUrl = new RegExp(`(^|[/@])github\\.com[/:]${repository}(\\.git)?/?$`);
    const urls = direction => {
        try {
            return git(['remote', 'get-url', ...direction, '--all', remote], { capture: true }).split('\n');
        } catch {
            return [];
        }
    };
    const all = [...urls([]), ...urls(['--push'])];
    return all.length > 0 && all.every(url => repositoryUrl.test(url.trim()));
}

// origin is the working repository, which a session's push reaches. Checked before anything reads it
function assertOrigin() {
    if (!names('origin', workingRepository)) {
        throw new Error(
            `Releases run from the working repository, which origin fetches from and pushes to. Point origin at it: git remote set-url origin https://github.com/${workingRepository}.git, and git config --unset-all remote.origin.pushurl when origin pushes elsewhere`
        );
    }
}

// The commit on GitHub's public main, fetched with no ref of its own and none of the public repository's tags
function fetchPublicMain() {
    git(['fetch', '--quiet', '--no-tags', publicUrl, 'main'], { capture: true });
    return git(['rev-parse', 'FETCH_HEAD'], { capture: true });
}

// GitHub's public main, the commit `main`, when the commit `release` holds it, and otherwise null. The release replaces
// that main's files with its own, on that main as their parent, so a push after the main moved is refused. The release
// holds it when its history does, as it holds the public repository's main from before its first release of one
// commit, or when that main is a release's commit there, whose files every later release builds on: the commit a
// public tag of a version names, holding the files of origin's tag of that version
function publicBase(release, main) {
    if (gitSucceeds(['merge-base', '--is-ancestor', main, release])) return main;
    // An annotated tag's line names its commit as refs/tags/<version>^{}
    const version = git(['ls-remote', '--tags', publicUrl], { capture: true })
        .split('\n')
        .map(line => line.split('\t'))
        .find(([commit, ref]) => commit === main && ref?.endsWith('^{}'))?.[1]
        .slice('refs/tags/'.length, -'^{}'.length);
    const tree = ref => (gitSucceeds(['rev-parse', '--verify', '--quiet', ref]) ? git(['rev-parse', ref], { capture: true }) : null);
    return version && tree(`refs/tags/${version}^{tree}`) === tree(`${main}^{tree}`) ? main : null;
}

const unreleasedPublicMain = `GitHub's public main has commits no release made, which publishing would undo. Merge them into main and push it to origin, and the next release publishes them: git pull --no-rebase --no-tags ${publicUrl} main`;

// Publishes the version `version`, released as the commit `release`, to GitHub's public repository: one commit on its
// main `base` with the files of `release`, titled with the version as the release commit is, and an annotated tag of
// the version on it. Neither gets a ref here, where the version's name is the working repository's tag. With dryRun,
// git checks the push and sends nothing
function publishPublic(version, release, base, { dryRun = false } = {}) {
    const commit = git(['commit-tree', `${release}^{tree}`, '-p', base, '-m', version], { capture: true });
    const tagger = git(['var', 'GIT_COMMITTER_IDENT'], { capture: true });
    const tag = git(['mktag'], { capture: true, input: `object ${commit}\ntype commit\ntag ${version}\ntagger ${tagger}\n\n${version}\n` });
    git(['push', ...(dryRun ? ['--dry-run'] : []), '--atomic', publicUrl, `${commit}:refs/heads/main`, `${tag}:refs/tags/${version}`]);
    return commit;
}

function assertTag(version) {
    if (git(['cat-file', '-t', `refs/tags/${version}`], { capture: true }) !== 'tag') {
        throw new Error(`Tag ${version} is not annotated`);
    }

    const taggedCommit = git(['rev-list', '-n', '1', version], { capture: true });
    const head = git(['rev-parse', 'HEAD'], { capture: true });
    if (taggedCommit !== head) throw new Error(`Tag ${version} does not point to the release commit`);
}

function assertReleaseCommit(version) {
    assertVersionFields(version);
    assertCompatibility(version);

    if (git(['status', '--porcelain'], { capture: true })) {
        throw new Error('npm version left uncommitted changes');
    }

    assertTag(version);

    const changedFiles = git(['show', '--pretty=format:', '--name-only', 'HEAD'], { capture: true }).split('\n').filter(Boolean).sort();
    const unexpected = changedFiles.some(file => file !== releaseNotesFile && !versionFiles.includes(file));
    if (unexpected || versionFiles.some(file => !changedFiles.includes(file))) {
        throw new Error(`Release commit changed unexpected files:\n${changedFiles.join('\n')}`);
    }
}

async function readChoice(question) {
    if (!stdin.isTTY || !stdout.isTTY) {
        throw new Error('Interactive input is unavailable. Pass a release type and --yes to release non-interactively');
    }

    const prompt = createInterface({ input: stdin, output: stdout });
    try {
        return (await prompt.question(question)).trim();
    } finally {
        prompt.close();
    }
}

async function selectReleaseType(currentVersion, currentReleased) {
    const choices = currentReleased ? ['patch', 'minor', 'major'] : ['current', 'patch', 'minor', 'major'];
    const labels = {
        current: `Current (${currentVersion}), not yet released`,
        patch: `Patch (${nextVersion(currentVersion, 'patch')})`,
        minor: `Minor (${nextVersion(currentVersion, 'minor')})`,
        major: `Major (${nextVersion(currentVersion, 'major')})`
    };

    console.log(`\nCurrent version: ${currentVersion}\n`);
    console.log('Select release type:');
    choices.forEach((choice, index) => console.log(`  ${index + 1}) ${labels[choice]}${index === 0 ? ' [default]' : ''}`));

    const answer = (await readChoice('\nEnter choice [1]: ')) || '1';
    const selected = choices[Number(answer) - 1];
    if (!/^\d+$/.test(answer) || !selected) throw new Error(`Invalid choice: ${answer}`);
    return selected;
}

async function confirmRelease(currentVersion, targetVersion) {
    const change = currentVersion === targetVersion ? targetVersion : `${currentVersion} -> ${targetVersion}`;
    const answer = (await readChoice(`Release ${change} from main? [y/N] `)).toLowerCase();
    return answer === 'y' || answer === 'yes';
}

function printUsage() {
    console.log(`Usage: node scripts/release [current|patch|minor|major|nightly] [--dry-run] [--yes]

Examples:
  node scripts/release
  node scripts/release minor --dry-run
  node scripts/release current
  CI=1 node scripts/release nightly

The script requires a clean main branch that matches origin/main, the working
repository. It runs the full quality gate, then either uses npm version to create the
version commit and annotated bare tag, or, for "current", tags the untagged version
already in the files. It pushes the new tag (with main, after a version commit) to
origin. GitHub's public repository, ${publicUrl},
then takes the release as one commit on its main, titled with the version and holding
the tag's files, with its own tag of the version, and GitHub Actions publishes the
release there.

"nightly" releases the newest entry in src/release-notes.ts as the next patch, without
asking, when that entry holds notes and is not tagged yet. When origin has the current
version tagged and the public repository doesn't, as after a failed public push, it
publishes that release there instead. Otherwise, or when the entry is the next minor or
major, it prints "Nothing to release" and changes nothing. npm version writes the
release day into the entry. A release by hand waits for that publishing. A release
refuses while the public main holds commits no release made; merge them into main and
push it to origin first:
  git pull --no-rebase --no-tags ${publicUrl} main`);
}

async function main() {
    const args = process.argv.slice(2);
    if (args.includes('--help') || args.includes('-h')) {
        printUsage();
        return;
    }

    let releaseType = args.find(argument => !argument.startsWith('--'));
    const unknown = args.filter(argument => argument !== releaseType && !['--dry-run', '--yes'].includes(argument));
    if ((releaseType && !releaseTypes.has(releaseType)) || unknown.length > 0) {
        printUsage();
        process.exitCode = 1;
        return;
    }

    const dryRun = args.includes('--dry-run');
    assertOrigin();
    const currentVersion = readJson('package.json').version;

    assertVersionFields(currentVersion);
    const currentReleased = isTagged(currentVersion);
    if (releaseType === 'current' && currentReleased) {
        throw new Error(`${currentVersion} is already released. Choose patch, minor or major`);
    }

    const nightly = releaseType === 'nightly';
    if (nightly) releaseType = 'patch';
    const selectedFromMenu = releaseType === undefined;
    releaseType ??= await selectReleaseType(currentVersion, currentReleased);
    // After the menu, which can stay open while main moves on, and before the nightly reads the notes main holds
    assertCleanMain();
    const publicMain = fetchPublicMain();

    // The last release, which origin has and GitHub's public repository may lack, as after a failed public push. The
    // nightly run publishes it there; a release by hand waits for that, unless its tag can't take the public main's
    // commits, merged into main since, which the next release then publishes with it
    const pending = remoteTag('origin', currentVersion) && !remoteTag(publicUrl, currentVersion);
    const pendingBase = pending ? publicBase(`refs/tags/${currentVersion}`, publicMain) : null;
    if (pendingBase && !nightly) {
        throw new Error(
            `${currentVersion} is released on origin but not yet on GitHub's public repository. Publish it there first: node scripts/release nightly`
        );
    }

    if (nightly) {
        if (pendingBase) {
            const commit = publishPublic(currentVersion, `refs/tags/${currentVersion}`, pendingBase, { dryRun });
            console.log(
                dryRun
                    ? `Dry run complete: GitHub's public repository can take ${currentVersion}, and nothing was pushed.`
                    : `Published ${currentVersion} on GitHub's public main as ${commit.slice(0, 7)}. GitHub Actions will build and publish the release assets.`
            );
            return;
        }
        if (pending && !publicBase('HEAD', publicMain)) throw new Error(unreleasedPublicMain);

        const newest = readReleaseNotes()[0];
        if (!hasNotes(newest) || isTagged(newest.version)) {
            // A pending release left here waits, as its tag lacks the public main's commits merged into main since
            console.log(
                pending
                    ? `Nothing to release: ${currentVersion} reaches GitHub's public repository with the next release, which holds the public main's commits`
                    : 'Nothing to release'
            );
            return;
        }

        const patchVersion = nextVersion(currentVersion, releaseType);
        if ([nextVersion(currentVersion, 'minor'), nextVersion(currentVersion, 'major')].includes(newest.version)) {
            console.log(`Nothing to release: ${newest.version} is released by hand`);
            return;
        }
        if (newest.version !== patchVersion) {
            throw new Error(
                `The newest entry in ${releaseNotesFile} is ${newest.version}, which is neither the next patch, ${patchVersion}, nor the next minor or major`
            );
        }
    }

    const targetVersion = nextVersion(currentVersion, releaseType);
    assertReleaseNotes(targetVersion);
    // A bump records its compatibility through npm version; the current version must already have its entry
    if (releaseType === 'current') assertCompatibility(targetVersion);
    else assertReleaseDate(targetVersion);
    if (isTagged(targetVersion)) throw new Error(`Tag ${targetVersion} already exists`);
    if (remoteTag(publicUrl, targetVersion)) throw new Error(`GitHub's public repository already has the tag ${targetVersion}`);
    // The release commit holds the public main when main here does
    const base = publicBase('HEAD', publicMain);
    if (!base) throw new Error(unreleasedPublicMain);

    console.log(releaseType === 'current' ? `Release ${targetVersion}` : `Release ${currentVersion} -> ${targetVersion}`);
    console.log('Release notes, versions, clean main, origin/main, the public main and tag availability are valid.');

    if (dryRun) {
        // The public push checked with main's files, which the release commit's differ from only in its version
        publishPublic(targetVersion, 'HEAD', base, { dryRun });
        console.log(`Dry run complete: ${targetVersion} can be released. No version commit or tag was created, and nothing was pushed.`);
        return;
    }

    if (!selectedFromMenu && !nightly && !args.includes('--yes') && !(await confirmRelease(currentVersion, targetVersion))) {
        console.log('Release cancelled.');
        return;
    }

    npm(['run', 'check']);
    if (git(['status', '--porcelain'], { capture: true })) {
        throw new Error('The build changed tracked files. Commit the generated changes before releasing');
    }

    if (releaseType === 'current') {
        git(['tag', '-a', targetVersion, '-m', targetVersion]);
        assertTag(targetVersion);
        git(['push', 'origin', `refs/tags/${targetVersion}`]);
    } else {
        npm(['version', releaseType]);
        assertReleaseCommit(targetVersion);
        try {
            git(['push', '--atomic', 'origin', 'main', `refs/tags/${targetVersion}`]);
        } catch (error) {
            // By hand, the commit and tag stay for a retry of the push. The nightly run gives this release up, as a push
            // racing another to main is refused for good, and leaves main as it found it for the next run: a local tag
            // left behind would read as released. --keep never discards an edit made meanwhile
            if (nightly) {
                git(['tag', '--delete', targetVersion], { capture: true });
                git(['reset', '--keep', 'HEAD~1'], { capture: true });
            }
            throw error;
        }
    }

    let commit;
    try {
        commit = publishPublic(targetVersion, `refs/tags/${targetVersion}`, base);
    } catch (error) {
        throw new Error(
            `${targetVersion} is released on origin, but GitHub's public repository did not take it (${error instanceof Error ? error.message : String(error)}). Run node scripts/release nightly to publish it there`
        );
    }
    console.log(
        `Released ${targetVersion}, on GitHub's public main as ${commit.slice(0, 7)}. GitHub Actions will build and publish the release assets.`
    );
}

main().catch(error => {
    console.error(`Release failed: ${error instanceof Error ? error.message : String(error)}`);
    console.error('Inspect git status, the latest commit and local tags before retrying.');
    process.exitCode = 1;
});
