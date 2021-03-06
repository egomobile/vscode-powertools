/**
 * This file is part of the vscode-powertools distribution.
 * Copyright (c) Next.e.GO Mobile SE, Aachen, Germany (https://www.e-go-mobile.com/)
 *
 * vscode-powertools is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation, version 3.
 *
 * vscode-powertools is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import * as ego_contracts from './contracts';
import * as ego_helpers from './helpers';
import * as ego_settings_global from './settings/global';
import * as ego_log from './log';
import * as moment from 'moment';
const opn = require('opn');
import * as vscode from 'vscode';


interface BoardReference {
    id: string;
    name: string;
    url: string;
}

interface BoardResult extends Result<BoardReference> {
}

interface BuildReference {
    buildNumber: string;
    id: number;
    queueTime: string;
    status: string;
    url: string;
}

interface BuildResult extends Result<BuildReference> {
}

interface DashboardReference {
    description: string;
    id: string;
    name: string;
    url: string;
}

interface DashboardResult {
    dashboardEntries: DashboardReference[];
}

interface GitRepositoryReference {
    defaultBranch: string;
    id: string;
    name: string;
}

interface GitRepositoryResult extends Result<GitRepositoryReference> {
}

interface ReleaseReference {
    createdOn: string;
    description: string;
    id: number;
    name: string;
    status: string;
}

interface ReleaseResult extends Result<ReleaseReference> {
}

interface Result<TObject> {
    count: number;
    value: TObject[];
}

interface TeamProjectReference {
    description: string;
    id: string;
    name: string;
    url: string;
}

interface TeamProjectResult extends Result<TeamProjectReference> {
}

interface WebApiTeamReference {
    description: string;
    id: string;
    name: string;
    url: string;
}

interface WebApiTeamResult extends Result<WebApiTeamReference> {
}

interface WikiV2Reference {
    id: string;
    name: string;
    url: string;
}

interface WikiV2Result extends Result<WikiV2Reference> {
}


class TeamProject {
    constructor(
        public readonly credentials: ego_contracts.AzureDevOpsAPICredentials,
        public readonly azureObject: TeamProjectReference
    ) { }

    public async getBuilds(): Promise<Build[]> {
        const RESULT: BuildResult = await vscode.window.withProgress({
            cancellable: false,
            location: vscode.ProgressLocation.Window,
            title: 'Azure DevOps Builds',
        }, async (progress) => {
            progress.report({
                message: 'Loading builds ...',
            });

            const RESPONSE = await ego_helpers.GET(`https://dev.azure.com/${ encodeURIComponent(this.credentials.organization) }/${ encodeURIComponent(this.azureObject.id) }/_apis/build/builds?api-version=5.0`, {
                'Authorization': 'Basic ' + this.credentials.toBase64(),
            });

            if (200 !== RESPONSE.code) {
                throw new Error(`Unexpected Response: [${ RESPONSE.code }] '${ RESPONSE.status }'`);
            }

            return JSON.parse(
                (await RESPONSE.readBody())
                    .toString('utf8')
            );
        });

        return ego_helpers.from(
            RESULT.value
        ).orderByDescending(b => b.id)
         .select(b => new Build(this, b))
         .toArray();
    }

    public async getGitRepositories(): Promise<GitRepository[]> {
        const RESULT: GitRepositoryResult = await vscode.window.withProgress({
            cancellable: false,
            location: vscode.ProgressLocation.Window,
            title: 'Azure DevOps Git',
        }, async (progress) => {
            progress.report({
                message: 'Loading git repositories ...',
            });

            const RESPONSE = await ego_helpers.GET(`https://dev.azure.com/${ encodeURIComponent(this.credentials.organization) }/${ encodeURIComponent(this.azureObject.id) }/_apis/git/repositories?api-version=5.0`, {
                'Authorization': 'Basic ' + this.credentials.toBase64(),
            });

            if (200 !== RESPONSE.code) {
                throw new Error(`Unexpected Response: [${ RESPONSE.code }] '${ RESPONSE.status }'`);
            }

            return JSON.parse(
                (await RESPONSE.readBody())
                    .toString('utf8')
            );
        });

        return ego_helpers.from(
            RESULT.value
        ).orderByDescending(gr => ego_helpers.normalizeString(gr.name))
         .select(gr => new GitRepository(this, gr))
         .toArray();
    }

    public async getReleases(): Promise<Release[]> {
        const RESULT: ReleaseResult = await vscode.window.withProgress({
            cancellable: false,
            location: vscode.ProgressLocation.Window,
            title: 'Azure DevOps Releases',
        }, async (progress) => {
            progress.report({
                message: 'Loading releases ...',
            });

            const RESPONSE = await ego_helpers.GET(`https://vsrm.dev.azure.com/${ encodeURIComponent(this.credentials.organization) }/${ encodeURIComponent(this.azureObject.id) }/_apis/release/releases?api-version=5.0`, {
                'Authorization': 'Basic ' + this.credentials.toBase64(),
            });

            if (200 !== RESPONSE.code) {
                throw new Error(`Unexpected Response: [${ RESPONSE.code }] '${ RESPONSE.status }'`);
            }

            return JSON.parse(
                (await RESPONSE.readBody())
                    .toString('utf8')
            );
        });

        return ego_helpers.from(
            RESULT.value
        ).orderByDescending(r => r.id)
         .select(r => new Release(this, r))
         .toArray();
    }

    public async getTeams(): Promise<WebApiTeam[]> {
        const RESULT: WebApiTeamResult = await vscode.window.withProgress({
            cancellable: false,
            location: vscode.ProgressLocation.Window,
            title: 'Azure DevOps Teams',
        }, async (progress) => {
            progress.report({
                message: 'Loading teams ...',
            });

            const RESPONSE = await ego_helpers.GET(`https://dev.azure.com/${ encodeURIComponent(this.credentials.organization) }/_apis/projects/${ encodeURIComponent(this.azureObject.id) }/teams?api-version=5.0`, {
                'Authorization': 'Basic ' + this.credentials.toBase64(),
            });

            if (200 !== RESPONSE.code) {
                throw new Error(`Unexpected Response: [${ RESPONSE.code }] '${ RESPONSE.status }'`);
            }

            return JSON.parse(
                (await RESPONSE.readBody())
                    .toString('utf8')
            );
        });

        return ego_helpers.from(
            RESULT.value
        ).orderBy(t => ego_helpers.normalizeString(t.name))
         .select(t => new WebApiTeam(this, t))
         .toArray();
    }

    public async getWikis(): Promise<Wiki[]> {
        const RESULT: WikiV2Result = await vscode.window.withProgress({
            cancellable: false,
            location: vscode.ProgressLocation.Window,
            title: 'Azure DevOps Teams',
        }, async (progress) => {
            progress.report({
                message: 'Loading teams ...',
            });

            const RESPONSE = await ego_helpers.GET(`https://dev.azure.com/${ encodeURIComponent(this.credentials.organization) }/${ encodeURIComponent(this.azureObject.id) }/_apis/wiki/wikis?api-version=5.0`, {
                'Authorization': 'Basic ' + this.credentials.toBase64(),
            });

            if (200 !== RESPONSE.code) {
                throw new Error(`Unexpected Response: [${ RESPONSE.code }] '${ RESPONSE.status }'`);
            }

            return JSON.parse(
                (await RESPONSE.readBody())
                    .toString('utf8')
            );
        });

        return ego_helpers.from(
            RESULT.value
        ).orderBy(w => ego_helpers.normalizeString(w.name))
         .select(w => new Wiki(this, w))
         .toArray();
    }

    public async openInBrowser() {
        const BROWSER_URL = `https://${ encodeURIComponent(this.credentials.organization) }.visualstudio.com/${ encodeURIComponent(this.azureObject.name) }`;

        opn(BROWSER_URL, {
            wait: false
        });
    }
}

class Build {
    constructor(
        public readonly project: TeamProject,
        public readonly azureObject: BuildReference,
    ) { }

    public get credentials() {
        return this.project
            .credentials;
    }

    public async openInBrowser() {
        const BROWSER_URL = `https://${
            encodeURIComponent(this.credentials.organization)
        }.visualstudio.com/${
            encodeURIComponent(this.project.azureObject.name)
        }/_build/results?buildId=${
            encodeURIComponent(this.azureObject.id.toString())
        }`;

        await opn(BROWSER_URL, {
            wait: false,
        });
    }
}

class GitRepository {
    constructor(
        public readonly project: TeamProject,
        public readonly azureObject: GitRepositoryReference,
    ) { }

    public get credentials() {
        return this.project
            .credentials;
    }

    public async openInBrowser() {
        const BROWSER_URL = `https://${
            encodeURIComponent(this.credentials.organization)
        }.visualstudio.com/${
            encodeURIComponent(this.project.azureObject.name)
        }/_git/${
            encodeURIComponent(this.azureObject.name)
        }`;

        await opn(BROWSER_URL, {
            wait: false,
        });
    }
}

class Release {
    constructor(
        public readonly project: TeamProject,
        public readonly azureObject: ReleaseReference,
    ) { }

    public get credentials() {
        return this.project
            .credentials;
    }

    public async openInBrowser() {
        const BROWSER_URL = `https://${
            encodeURIComponent(this.credentials.organization)
        }.visualstudio.com/${
            encodeURIComponent(this.project.azureObject.name)
        }/_releaseProgress?releaseId=${
            encodeURIComponent(this.azureObject.id.toString())
        }`;

        await opn(BROWSER_URL, {
            wait: false,
        });
    }
}

class WebApiTeam {
    constructor(
        public readonly project: TeamProject,
        public readonly azureObject: WebApiTeamReference,
    ) { }

    public get credentials() {
        return this.project
            .credentials;
    }

    public async getBoards(): Promise<Board[]> {
        const RESULT: BoardResult = await vscode.window.withProgress({
            cancellable: false,
            location: vscode.ProgressLocation.Window,
            title: 'Azure DevOps Boards',
        }, async (progress) => {
            progress.report({
                message: 'Loading boards ...',
            });

            const RESPONSE = await ego_helpers.GET(`https://dev.azure.com/${ encodeURIComponent(this.credentials.organization) }/${ encodeURIComponent(this.project.azureObject.id) }/${ encodeURIComponent(this.azureObject.id) }/_apis/work/boards?api-version=5.0`, {
                'Authorization': 'Basic ' + this.credentials.toBase64(),
            });

            if (200 !== RESPONSE.code) {
                throw new Error(`Unexpected Response: [${ RESPONSE.code }] '${ RESPONSE.status }'`);
            }

            return JSON.parse(
                (await RESPONSE.readBody())
                    .toString('utf8')
            );
        });

        return ego_helpers.from(
            RESULT.value
        ).orderBy(b => ego_helpers.normalizeString(b.name))
         .select(b => new Board(this, b))
         .toArray();
    }

    public async getDashboards(): Promise<Dashboard[]> {
        const RESULT: DashboardResult = await vscode.window.withProgress({
            cancellable: false,
            location: vscode.ProgressLocation.Window,
            title: 'Azure DevOps Dashboards',
        }, async (progress) => {
            progress.report({
                message: 'Loading dashboards ...',
            });

            const RESPONSE = await ego_helpers.GET(`https://dev.azure.com/${ encodeURIComponent(this.credentials.organization) }/${ encodeURIComponent(this.project.azureObject.id) }/${ encodeURIComponent(this.azureObject.id) }/_apis/dashboard/dashboards?api-version=5.0-preview.2`, {
                'Authorization': 'Basic ' + this.credentials.toBase64(),
            });

            if (200 !== RESPONSE.code) {
                throw new Error(`Unexpected Response: [${ RESPONSE.code }] '${ RESPONSE.status }'`);
            }

            return JSON.parse(
                (await RESPONSE.readBody())
                    .toString('utf8')
            );
        });

        return ego_helpers.from(
            RESULT.dashboardEntries
        ).orderBy(d => ego_helpers.normalizeString(d.name))
         .select(d => new Dashboard(this, d))
         .toArray();
    }
}

class Board {
    constructor(
        public readonly team: WebApiTeam,
        public readonly azureObject: BoardReference,
    ) { }

    public get credentials() {
        return this.team
            .credentials;
    }

    public async openInBrowser() {
        const BROWSER_URL = `https://${
            encodeURIComponent(this.credentials.organization)
        }.visualstudio.com/${
            encodeURIComponent(this.team.project.azureObject.name)
        }/_boards/board/t/${
            encodeURIComponent(this.team.azureObject.name)
        }/${
            encodeURIComponent(this.azureObject.name)
        }`;

        await opn(BROWSER_URL, {
            wait: false,
        });
    }
}

class Dashboard {
    constructor(
        public readonly team: WebApiTeam,
        public readonly azureObject: WikiV2Reference,
    ) { }

    public get credentials() {
        return this.team
            .credentials;
    }

    public async openInBrowser() {
        const BROWSER_URL = `https://${
            encodeURIComponent(this.credentials.organization)
        }.visualstudio.com/${
            encodeURIComponent(this.team.project.azureObject.name)
        }/_dashboards/dashboard/${
            encodeURIComponent(this.azureObject.id)
        }`;

        opn(BROWSER_URL, {
            wait: false
        });
    }
}

class Wiki {
    constructor(
        public readonly project: TeamProject,
        public readonly azureObject: WikiV2Reference,
    ) { }

    public get credentials() {
        return this.project
            .credentials;
    }

    public async openInBrowser() {
        const BROWSER_URL = `https://${
            encodeURIComponent(this.credentials.organization)
        }.visualstudio.com/${
            encodeURIComponent(this.project.azureObject.name)
        }/_wiki/wikis/${
            encodeURIComponent(this.azureObject.name)
        }`;

        opn(BROWSER_URL, {
            wait: false
        });
    }
}


/**
 * Tries to return the Azure DevOps API credentials.
 *
 * @param {vscode.ExtensionContext} extension The underlying extension (context).
 *
 * @return {string|false} The credentials or (false) if not found.
 */
export function getAzureDevOpsAPICredentials(extension: vscode.ExtensionContext): ego_contracts.AzureDevOpsAPICredentials | false {
    let organization: string;
    let username: string;
    let pat: string;

    // first try workspace
    try {
        organization = ego_helpers.normalizeString(
            extension.workspaceState
                .get(ego_contracts.KEY_GLOBAL_SETTING_AZURE_DEVOPS_WORKSPACE_ORG)
        );

        username = ego_helpers.normalizeString(
            extension.workspaceState
                .get(ego_contracts.KEY_GLOBAL_SETTING_AZURE_DEVOPS_WORKSPACE_USERNAME)
        );

        pat = ego_helpers.toStringSafe(
            extension.workspaceState
                .get(ego_contracts.KEY_GLOBAL_SETTING_AZURE_DEVOPS_WORKSPACE_PAT)
        ).trim();
    } catch (e) {
        ego_log.CONSOLE
            .trace(e, 'azure.getAzureDevOpsPAT(1)');
    }

    if (ego_helpers.isEmptyString(pat)) {
        // now try global

        try {
            organization = ego_helpers.normalizeString(
                extension.globalState
                    .get(ego_contracts.KEY_GLOBAL_SETTING_AZURE_DEVOPS_GLOBAL_ORG)
            );

            username = ego_helpers.normalizeString(
                extension.globalState
                    .get(ego_contracts.KEY_GLOBAL_SETTING_AZURE_DEVOPS_GLOBAL_USERNAME)
            );

            pat = ego_helpers.toStringSafe(
                extension.globalState
                    .get(ego_contracts.KEY_GLOBAL_SETTING_AZURE_DEVOPS_GLOBAL_PAT)
            ).trim();
        } catch (e) {
            ego_log.CONSOLE
                .trace(e, 'azure.getAzureDevOpsPAT(2)');
        }
    }

    if (ego_helpers.isEmptyString(organization) || ego_helpers.isEmptyString(username) || ego_helpers.isEmptyString(pat)) {
        return false;
    }

    return {
        organization: organization,
        pat: pat,
        toBase64: function() {
            return Buffer.from(`${ this.username }:${ this.pat }`, 'ascii')
                .toString('base64');
        },
        username: username,
    };
}

/**
 * Shows actions for Azure DevOps operations.
 *
 * @param {vscode.ExtensionContext} extension The underlying extension (context).
 * @param {vscode.OutputChannel} output The underlying output channel.
 */
export async function showAzureDevOpsActions(
    extension: vscode.ExtensionContext,
    output: vscode.OutputChannel,
) {
    const API_CRED = getAzureDevOpsAPICredentials(extension);
    if (!API_CRED) {
        vscode.window.showWarningMessage(
            'Please define the API credentials in the global settings!'
        );

        await ego_settings_global.openGlobalSettings(extension, 'azuredevops');

        return;
    }

    const QUICK_PICKS: ego_contracts.ActionQuickPickItem[] = [
        {
            'action': async () => {
                await showAzureDevOpsProjectSelector(API_CRED);
            },
            'label': 'Projects ...',
            'description': 'Opens a project.'
        }
    ];

    const SELECTED_ITEM = await vscode.window.showQuickPick(
        QUICK_PICKS
    );

    if (SELECTED_ITEM) {
        await Promise.resolve(
            SELECTED_ITEM.action()
        );
    }
}

async function showAzureDevOpsBoardSelector(team: WebApiTeam) {
    const BOARDS = await team.getBoards();

    const QUICK_PICKS: ego_contracts.ActionQuickPickItem[] = ego_helpers.from(
        BOARDS.map(b => {
            return {
                action: async () => {
                    await b.openInBrowser();
                },
                label: b.azureObject.name,
            };
        })
    ).orderBy(qp => ego_helpers.normalizeString(qp.label))
     .toArray();

    if (!QUICK_PICKS.length) {
        vscode.window.showWarningMessage(
            'No board found!'
        );

        return;
    }

    let selectedItem: ego_contracts.ActionQuickPickItem;
    if (1 === QUICK_PICKS.length) {
        selectedItem = QUICK_PICKS[0];
    } else {
        selectedItem = await vscode.window.showQuickPick(
            QUICK_PICKS,
            {
                canPickMany: false,
                ignoreFocusOut: true,
                placeHolder: 'Please select a board ...'
            }
        );
    }

    if (selectedItem) {
        await selectedItem.action();
    }
}

async function showAzureDevOpsBuildSelector(proj: TeamProject) {
    const BUILDS = await proj.getBuilds();

    const QUICK_PICKS: ego_contracts.ActionQuickPickItem[] = ego_helpers.from(
        BUILDS.map(b => {
            let icon = '';
            switch (ego_helpers.normalizeString(b.azureObject.status)) {
                case 'cancelling':
                    icon = '$(circle-slash)';
                    break;

                case 'completed':
                    icon = '$(check)';
                    break;

                case 'inprogress':
                    icon = '$(triangle-right)';
                    break;

                case 'notstarted':
                    icon = '$(watch)';
                    break;

                case 'postponed':
                    icon = '$(primitive-square)';
                    break;
            }

            return {
                action: async () => {
                    await b.openInBrowser();
                },
                build: b,
                label: icon + ('' === icon ? '' : '  ') +
                    b.azureObject.buildNumber,
                detail: `${
                    'Queued on: ' + moment.utc(b.azureObject.queueTime)
                        .local()
                        .format('YYYY-MM-DD HH:mm:ss')
                }; Status: ${ ego_helpers.toStringSafe(b.azureObject.status) }`,
            };
        })
    ).orderByDescending(qp => ego_helpers.normalizeString(qp.detail))
     .thenBy(qp => ego_helpers.normalizeString(qp.build.azureObject.buildNumber))
     .toArray();

    if (!QUICK_PICKS.length) {
        vscode.window.showWarningMessage(
            'No build found!'
        );

        return;
    }

    let selectedItem: ego_contracts.ActionQuickPickItem;
    if (1 === QUICK_PICKS.length) {
        selectedItem = QUICK_PICKS[0];
    } else {
        selectedItem = await vscode.window.showQuickPick(
            QUICK_PICKS,
            {
                canPickMany: false,
                ignoreFocusOut: true,
                placeHolder: 'Please select a build ...',
                matchOnDescription: true,
                matchOnDetail: true,
            }
        );
    }

    if (selectedItem) {
        await selectedItem.action();
    }
}

async function showAzureDevOpsDashboardSelector(team: WebApiTeam) {
    const DASHBOARDS = await team.getDashboards();

    const QUICK_PICKS: ego_contracts.ActionQuickPickItem[] = ego_helpers.from(
        DASHBOARDS.map(db => {
            return {
                action: async () => {
                    await db.openInBrowser();
                },
                label: db.azureObject.name,
            };
        })
    ).orderBy(qp => ego_helpers.normalizeString(qp.label))
     .toArray();

    if (!QUICK_PICKS.length) {
        vscode.window.showWarningMessage(
            'No dashboard found!'
        );

        return;
    }

    let selectedItem: ego_contracts.ActionQuickPickItem;
    if (1 === QUICK_PICKS.length) {
        selectedItem = QUICK_PICKS[0];
    } else {
        selectedItem = await vscode.window.showQuickPick(
            QUICK_PICKS,
            {
                canPickMany: false,
                ignoreFocusOut: true,
                placeHolder: 'Please select a dashboard ...'
            }
        );
    }

    if (selectedItem) {
        await selectedItem.action();
    }
}

async function showAzureDevOpsGitRepoSelector(proj: TeamProject) {
    const GIT_REPOS = await proj.getGitRepositories();

    const QUICK_PICKS: ego_contracts.ActionQuickPickItem[] = ego_helpers.from(
        GIT_REPOS.map(gr => {
            return {
                action: async () => {
                    await gr.openInBrowser();
                },
                label: gr.azureObject.name,
            };
        })
    ).orderBy(qp => ego_helpers.normalizeString(qp.label))
     .toArray();

    if (!QUICK_PICKS.length) {
        vscode.window.showWarningMessage(
            'No git repository found!'
        );

        return;
    }

    let selectedItem: ego_contracts.ActionQuickPickItem;
    if (1 === QUICK_PICKS.length) {
        selectedItem = QUICK_PICKS[0];
    } else {
        selectedItem = await vscode.window.showQuickPick(
            QUICK_PICKS,
            {
                canPickMany: false,
                ignoreFocusOut: true,
                placeHolder: 'Please select a git repository ...',
            }
        );
    }

    if (selectedItem) {
        await selectedItem.action();
    }
}

async function showAzureDevOpsProjectActions(proj: TeamProject) {
    const QUICK_PICKS: ego_contracts.ActionQuickPickItem[] = [
        {
            action: async () => {
                await showAzureDevOpsBuildSelector(proj);
            },
            label: 'Builds ...',
            description: 'Selects a build.'
        },
        {
            action: async () => {
                await showAzureDevOpsGitRepoSelector(proj);
            },
            label: 'Git Repositories ...',
            description: 'Selects a git repository.'
        },
        {
            action: async () => {
                await showAzureDevOpsReleaseSelector(proj);
            },
            label: 'Releases ...',
            description: 'Selects a release.'
        },
        {
            action: async () => {
                await showAzureDevOpsTeamSelector(proj);
            },
            label: 'Teams ...',
            description: 'Selects a team.'
        },
        {
            action: async () => {
                await showAzureDevOpsWikiSelector(proj);
            },
            label: 'Wikis ...',
            description: 'Selects a wiki.'
        },
    ];

    const SELECTED_ITEM = await vscode.window.showQuickPick(
        QUICK_PICKS,
        {
            canPickMany: false,
            ignoreFocusOut: true,
            placeHolder: 'Please select a board ...'
        }
    );

    if (SELECTED_ITEM) {
        await SELECTED_ITEM.action();
    }
}

async function showAzureDevOpsProjectSelector(cred: ego_contracts.AzureDevOpsAPICredentials) {
    const RESULT: TeamProjectResult = await vscode.window.withProgress({
        cancellable: false,
        location: vscode.ProgressLocation.Window,
        title: 'Azure DevOps Projects',
    }, async (progress) => {
        progress.report({
            message: 'Loading projects ...',
        });

        const RESPONSE = await ego_helpers.GET(`https://dev.azure.com/${ encodeURIComponent(cred.organization) }/_apis/projects?api-version=5.0`, {
            'Authorization': 'Basic ' + cred.toBase64(),
        });

        if (200 !== RESPONSE.code) {
            throw new Error(`Unexpected Response: [${ RESPONSE.code }] '${ RESPONSE.status }'`);
        }

        return JSON.parse(
            (await RESPONSE.readBody())
                .toString('utf8')
        );
    });

    const QUICK_PICKS: ego_contracts.ActionQuickPickItem[] = ego_helpers.from(
        RESULT.value.map(p => {
            const PROJ = new TeamProject(cred, p);

            return {
                action: async () => {
                    await showAzureDevOpsProjectActions(PROJ);
                },
                description: p.description,
                label: p.name,
            };
        })
    ).orderBy(qp => ego_helpers.normalizeString(qp.label))
     .toArray();

    if (!QUICK_PICKS.length) {
        vscode.window.showWarningMessage(
            'No project found!'
        );

        return;
    }

    let selectedItem: ego_contracts.ActionQuickPickItem;
    if (1 === QUICK_PICKS.length) {
        selectedItem = QUICK_PICKS[0];
    } else {
        selectedItem = await vscode.window.showQuickPick(
            QUICK_PICKS,
            {
                canPickMany: false,
                ignoreFocusOut: true,
                placeHolder: 'Please select a project ...'
            }
        );
    }

    if (selectedItem) {
        await selectedItem.action();
    }
}

async function showAzureDevOpsReleaseSelector(proj: TeamProject) {
    const RELEASES = await proj.getReleases();

    const QUICK_PICKS: ego_contracts.ActionQuickPickItem[] = ego_helpers.from(
        RELEASES.map(r => {
            let icon = '';
            switch (ego_helpers.normalizeString(r.azureObject.status)) {
                case 'abandoned':
                    icon = '$(circle-slash)';
                    break;

                case 'active':
                    icon = '$(triangle-right)';
                    break;

                case 'draft':
                    icon = '$(pencil)';
                    break;
            }

            return {
                action: async () => {
                    await r.openInBrowser();
                },
                description: r.azureObject.description,
                detail: `${
                    'Created on: ' + moment.utc(r.azureObject.createdOn)
                        .local()
                        .format('YYYY-MM-DD HH:mm:ss')
                }; Status: ${ ego_helpers.toStringSafe(r.azureObject.status) }`,
                label: icon + ('' === icon ? '' : '  ') +
                    r.azureObject.name,
                release: r,
            };
        })
    ).orderByDescending(qp => ego_helpers.normalizeString(qp.detail))
     .thenByDescending(qp => ego_helpers.normalizeString(qp.release.azureObject.id))
     .thenBy(qp => ego_helpers.normalizeString(qp.release.azureObject.name))
     .toArray();

    if (!QUICK_PICKS.length) {
        vscode.window.showWarningMessage(
            'No release found!'
        );

        return;
    }

    let selectedItem: ego_contracts.ActionQuickPickItem;
    if (1 === QUICK_PICKS.length) {
        selectedItem = QUICK_PICKS[0];
    } else {
        selectedItem = await vscode.window.showQuickPick(
            QUICK_PICKS,
            {
                canPickMany: false,
                ignoreFocusOut: true,
                placeHolder: 'Please select a release ...',
            }
        );
    }

    if (selectedItem) {
        await selectedItem.action();
    }
}

async function showAzureDevOpsTeamActions(team: WebApiTeam) {
    const QUICK_PICKS: ego_contracts.ActionQuickPickItem[] = [
        {
            action: async () => {
                await showAzureDevOpsBoardSelector(team);
            },
            label: 'Boards ...',
            description: 'Selects a board.'
        },
        {
            action: async () => {
                await showAzureDevOpsDashboardSelector(team);
            },
            label: 'Dashboards ...',
            description: 'Selects a dashboards.'
        },
    ];

    const SELECTED_ITEM = await vscode.window.showQuickPick(
        QUICK_PICKS,
        {
            canPickMany: false,
            ignoreFocusOut: true,
            placeHolder: 'Please select a board ...'
        }
    );

    if (SELECTED_ITEM) {
        await SELECTED_ITEM.action();
    }
}

async function showAzureDevOpsTeamSelector(proj: TeamProject) {
    const TEAMS = await proj.getTeams();

    const QUICK_PICKS: ego_contracts.ActionQuickPickItem[] = ego_helpers.from(
        TEAMS.map(t => {
            return {
                action: async () => {
                    await showAzureDevOpsTeamActions(t);
                },
                description: t.azureObject.description,
                label: t.azureObject.name,
            };
        })
    ).orderBy(qp => ego_helpers.normalizeString(qp.label))
     .toArray();

    if (!QUICK_PICKS.length) {
        vscode.window.showWarningMessage(
            'No team found!'
        );

        return;
    }

    let selectedItem: ego_contracts.ActionQuickPickItem;
    if (1 === QUICK_PICKS.length) {
        selectedItem = QUICK_PICKS[0];
    } else {
        selectedItem = await vscode.window.showQuickPick(
            QUICK_PICKS,
            {
                canPickMany: false,
                ignoreFocusOut: true,
                placeHolder: 'Please select a team ...'
            }
        );
    }

    if (selectedItem) {
        await selectedItem.action();
    }
}

async function showAzureDevOpsWikiSelector(proj: TeamProject) {
    const WIKIS = await proj.getWikis();

    const QUICK_PICKS: ego_contracts.ActionQuickPickItem[] = ego_helpers.from(
        WIKIS.map(w => {
            return {
                action: async () => {
                    await w.openInBrowser();
                },
                label: w.azureObject.name,
            };
        })
    ).orderBy(qp => ego_helpers.normalizeString(qp.label))
     .toArray();

    if (!QUICK_PICKS.length) {
        vscode.window.showWarningMessage(
            'No wiki found!'
        );

        return;
    }

    let selectedItem: ego_contracts.ActionQuickPickItem;
    if (1 === QUICK_PICKS.length) {
        selectedItem = QUICK_PICKS[0];
    } else {
        selectedItem = await vscode.window.showQuickPick(
            QUICK_PICKS,
            {
                canPickMany: false,
                ignoreFocusOut: true,
                placeHolder: 'Please select a wiki ...'
            }
        );
    }

    if (selectedItem) {
        await selectedItem.action();
    }
}
