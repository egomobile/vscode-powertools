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

import * as _ from 'lodash';
const coffeeScript = require('coffeescript');
import * as ego_contracts from './contracts';
import * as ego_helpers from './helpers';
import * as ego_webview from './webview';
import * as ego_workspace from './workspace';
import * as ejs from 'ejs';
import * as fsExtra from 'fs-extra';
import * as htmlEntities from 'html-entities';
import * as vscode from 'vscode';


/**
 * A web view for a text editor with a script.
 */
export class ScriptConsoleWebView extends ego_webview.WebViewWithContextBase {
    private _cancelSource: vscode.CancellationTokenSource;
    private readonly _RUN_ON_OPEN: boolean;

    /**
     * Initializes a new instance of that class.
     *
     * @param {vscode.ExtensionContext} extension The extension context.
     * @param {vscode.TextEditor} editor The underlying editor.
     * @param {boolean} [runOnOpen] Run script after web view has been opened.
     */
    public constructor(
        public readonly extension: vscode.ExtensionContext,
        public readonly editor: vscode.TextEditor,
        runOnOpen?: boolean
    ) {
        super(extension);

        this._RUN_ON_OPEN = ego_helpers.toBooleanSafe(
            runOnOpen
        );
    }

    /**
     * @inheritdoc
     */
    protected generateHtmlBody(): string {
        const FILE = this.getFileResourceUri('tpl/ScriptConsole.ejs')
            .fsPath;

        return ejs.render(
            fsExtra.readFileSync(
                FILE, 'utf8'
            )
        );
    }

    /**
     * @inheritdoc
     */
    protected getTitle(): string {
        return ``;
    }

    /**
     * @inheritdoc
     */
    protected getType(): string {
        return 'ScriptConsole';
    }

    /**
     * @inheritdoc
     */
    protected getViewColumns(): ego_contracts.ViewColumnSettings {
        return vscode.ViewColumn.Two;
    }

    /**
     * @inheritdoc
     */
    protected async onLoaded() {
        if (this._RUN_ON_OPEN) {
            await this.postMessage(
                'startScript'
            );
        }
    }

    /**
     * @inheritdoc
     */
    protected async onWebViewMessage(msg: ego_contracts.WebViewMessage): Promise<boolean> {
        switch (msg.command) {
            case 'cancelScript':
                {
                    const CANCEL_SRC = this._cancelSource;
                    if (!_.isNil(CANCEL_SRC)) {
                        const SELECTED_ITEM = await vscode.window.showWarningMessage(
                            'Do you really want to CANCEL the script?',
                            'No', 'YES!'
                        );

                        if ('YES!' === SELECTED_ITEM) {
                            CANCEL_SRC.cancel();
                        } else {
                            await this.postMessage(
                                'scriptCancellationAborted'
                            );
                        }
                    }
                }
                break;

            case 'runScript':
                if (_.isNil(this._cancelSource)) {
                    // 'ScriptConsoleWebView' instance
                    const _0c44c5cd8ea84aafbf9ad2ed69c54b38 = this;
                    _0c44c5cd8ea84aafbf9ad2ed69c54b38._cancelSource = new vscode.CancellationTokenSource();

                    let err: any;
                    try {
                        await (async function() {
                            // @ts-ignore
                            const $cancel = _0c44c5cd8ea84aafbf9ad2ed69c54b38._cancelSource
                                .token;

                            // @ts-ignore
                            const _ = require('lodash');
                            // @ts-ignore
                            const $fs = require('fs-extra');
                            // @ts-ignore
                            const $helpers = require('./helpers');
                            // @ts-ignore
                            const $html = new htmlEntities.AllHtmlEntities();
                            // @ts-ignore
                            const $path = require('path');
                            // @ts-ignore
                            const $moment = require('moment');
                            // @ts-ignore
                            const $vscode = require('vscode');

                            // @ts-ignore
                            const $getWorkspaces = () => {
                                return ego_helpers.from(
                                    ego_workspace.getAllWorkspaces()
                                ).select(ws => {
                                    return ws.getInfo();
                                }).orderBy(wi => {
                                    return wi.index;
                                }).thenBy(wi => {
                                    return ego_helpers.normalizeString(
                                        wi.name
                                    );
                                }).thenBy(wi => {
                                    return ego_helpers.normalizeString(
                                        wi.rootPath
                                    );
                                }).toArray();
                            };

                            // @ts-ignore
                            const $workspaces = ego_workspace.getWorkspaceList();

                            // @ts-ignore
                            const $alert = async (msg: any) => {
                                await $vscode.window.showWarningMessage(
                                    $helpers.toStringSafe(msg)
                                );
                            };

                            // @ts-ignore
                            const $clear = () => {
                                _0c44c5cd8ea84aafbf9ad2ed69c54b38
                                    .postMessage('clear');
                            };
                            // @ts-ignore
                            const $writeHtml = (html: any) => {
                                _0c44c5cd8ea84aafbf9ad2ed69c54b38
                                    .postMessage('writeHtml', ego_helpers.toStringSafe(html));
                            };
                            // @ts-ignore
                            const $write = (msg: any) => {
                                $writeHtml(`<span>${ new htmlEntities.AllHtmlEntities().encode(
                                    ego_helpers.toStringSafe(msg)
                                ) }</span>`);
                            };
                            // @ts-ignore
                            const $writeLine = (msg: any) => {
                                $writeHtml(`<div>${ new htmlEntities.AllHtmlEntities().encode(
                                    ego_helpers.toStringSafe(msg)
                                ) }</div>`);
                            };
                            // @ts-ignore
                            const $writeMarkdown = (md: any) => {
                                _0c44c5cd8ea84aafbf9ad2ed69c54b38
                                    .postMessage('writeMarkdown', ego_helpers.toStringSafe(md));
                            };

                            // @ts-ignore
                            const $dump = (val: any) => {
                                $writeHtml(`<pre>${ new htmlEntities.AllHtmlEntities().encode(
                                    JSON.stringify(val, null, 2)
                                ) }</pre>`);
                            };

                            // @ts-ignore
                            const $require = (id: string) => {
                                return ego_helpers.requireModule(id);
                            };

                            // @ts-ignore
                            const $sleep = (sec: number) => {
                                return ego_helpers.sleep(
                                    Math.floor(
                                        parseFloat(
                                            ego_helpers.toStringSafe(sec).trim()
                                        ) * 1000.0
                                    )
                                );
                            };

                            // @ts-ignore
                            const $withProgress = (task: Function) => {
                                return vscode.window.withProgress({
                                    cancellable: true,
                                    location: $vscode.ProgressLocation.Notification,
                                }, async (progress, cancelToken) => {
                                    return Promise.resolve(
                                        task(progress, cancelToken)
                                    );
                                });
                            };

                            let runner_ae2cd693a603498c80892714d92c03c2: () => any;
                            switch (ego_helpers.normalizeString(_0c44c5cd8ea84aafbf9ad2ed69c54b38.editor.document.languageId)) {
                                case 'coffeescript':
                                    runner_ae2cd693a603498c80892714d92c03c2 = () => {
                                        const COFFEE_LINES = _0c44c5cd8ea84aafbf9ad2ed69c54b38.editor
                                            .document
                                            .getText()
                                            .split('\n')
                                            .map(l => '    ' + l)
                                            .join('\n');

                                        const COFFEE_CODE = `runScript_334ea678a32a48949217e526b84da7b7 = (tm_83989812938141258fadc68906a0e2e8) ->
${ COFFEE_LINES }

return runScript_334ea678a32a48949217e526b84da7b7 19790905`;

                                        const FINAL_CODE = coffeeScript.compile(COFFEE_CODE, {
                                            bare: true,
                                        });

                                        return eval(`(async () => {

${ FINAL_CODE }

})()`);
                                    };
                                    break;

                                default:
                                    runner_ae2cd693a603498c80892714d92c03c2 = () => {
                                        return eval(`(async () => {

${
    _0c44c5cd8ea84aafbf9ad2ed69c54b38.editor
        .document
        .getText()
}

})()`);
                                    };
                                    break;
                            }

                            return await Promise.resolve(
                                runner_ae2cd693a603498c80892714d92c03c2()
                            );
                        })();
                    } catch (e) {
                        if (e instanceof Error) {
                            err = {
                                name: ego_helpers.toStringSafe(e.name),
                                message: ego_helpers.toStringSafe(e.message),
                                stack: ego_helpers.toStringSafe(e.stack),
                            };
                        } else {
                            err = {
                                message: ego_helpers.toStringSafe(e),
                            };
                        }
                    } finally {
                        ego_helpers.tryDispose(this._cancelSource);
                        this._cancelSource = null;

                        await this.postMessage(
                            'scriptFinished', err
                        );
                    }
                }
                break;

            default:
                return false;
        }

        return true;
    }
}
