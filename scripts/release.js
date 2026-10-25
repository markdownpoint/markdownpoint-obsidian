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

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

// One level up, because this script lives in scripts/ while every path it touches, and the
// working directory every git command needs, is the repository root
const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
// "current" publishes the version already in the files when it has never been tagged, such as the first release
const releaseTypes = new Set(['current', 'patch', 'minor', 'major']);
const versionFiles = ['manifest.json', 'package.json', 'package-lock.json', 'versions.json'];

function run(command, args, options = {}) {
    return execFileSync(command, args, {
        cwd: projectRoot,
        encoding: 'utf8',
        stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit'
    })?.trim();
}

function git(args, options = {}) {
    return run('git', args, options);
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

function isTagged(version) {
    if (git(['tag', '--list', version], { capture: true })) return true;
    return Boolean(git(['ls-remote', '--tags', 'origin', `refs/tags/${version}`, `refs/tags/${version}^{}`], { capture: true }));
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
    if (changedFiles.join('\n') !== [...versionFiles].sort().join('\n')) {
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
    console.log(`Usage: node scripts/release [current|patch|minor|major] [--dry-run] [--yes]

Examples:
  node scripts/release
  node scripts/release minor --dry-run
  node scripts/release current

The script requires a clean main branch that matches origin/main. It runs the full
quality gate, then either uses npm version to create the version commit and annotated
bare tag, or, for "current", tags the untagged version already in the files. It pushes
the new tag (with main, after a version commit) and GitHub Actions publishes the release.`);
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
    const currentVersion = readJson('package.json').version;

    assertVersionFields(currentVersion);
    const currentReleased = isTagged(currentVersion);
    if (releaseType === 'current' && currentReleased) {
        throw new Error(`${currentVersion} is already released. Choose patch, minor or major`);
    }

    const selectedFromMenu = releaseType === undefined;
    releaseType ??= await selectReleaseType(currentVersion, currentReleased);
    const targetVersion = nextVersion(currentVersion, releaseType);
    // A bump records its compatibility through npm version; the current version must already have its entry
    if (releaseType === 'current') assertCompatibility(targetVersion);
    assertCleanMain();
    if (isTagged(targetVersion)) throw new Error(`Tag ${targetVersion} already exists`);

    console.log(releaseType === 'current' ? `Release ${targetVersion}` : `Release ${currentVersion} -> ${targetVersion}`);
    console.log('Versions, clean main, origin/main and tag availability are valid.');

    if (dryRun) {
        console.log('Dry run complete. No version commit or tag was created.');
        return;
    }

    if (!selectedFromMenu && !args.includes('--yes') && !(await confirmRelease(currentVersion, targetVersion))) {
        console.log('Release cancelled.');
        return;
    }

    run('npm', ['run', 'check']);
    if (git(['status', '--porcelain'], { capture: true })) {
        throw new Error('The build changed tracked files. Commit the generated changes before releasing');
    }

    if (releaseType === 'current') {
        git(['tag', '-a', targetVersion, '-m', targetVersion]);
        assertTag(targetVersion);
        git(['push', 'origin', `refs/tags/${targetVersion}`]);
    } else {
        run('npm', ['version', releaseType]);
        assertReleaseCommit(targetVersion);
        git(['push', '--atomic', 'origin', 'main', `refs/tags/${targetVersion}`]);
    }
    console.log(`Released ${targetVersion}. GitHub Actions will build and publish the release assets.`);
}

main().catch(error => {
    console.error(`Release failed: ${error instanceof Error ? error.message : String(error)}`);
    console.error('Inspect git status, the latest commit and local tags before retrying.');
    process.exitCode = 1;
});
