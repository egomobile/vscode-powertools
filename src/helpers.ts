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
import * as ego_code from './code';
import * as ego_contracts from './contracts';
import * as fsExtra from 'fs-extra';
const markdownEscapes = require('markdown-escapes');
import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';
import {
    asArray,
    cloneObject,
    exists,
    isEmptyString,
    normalizeString,
    toBooleanSafe,
    toStringSafe,
} from 'vscode-helpers';

export * from 'vscode-helpers';


/**
 * Builds a button for the status bar.
 *
 * @param {TButton} button The button (settings).
 * @param {Function} [setup] The setup function.
 *
 * @return {vscode.StatusBarItem} The new status bar item.
 */
export function buildButtonSync<TButton extends ego_contracts.Button = ego_contracts.Button>(
    button: TButton,
    setup?: (newStatusBarItem: vscode.StatusBarItem, button: TButton) => void
): vscode.StatusBarItem {
    if (_.isNil(button)) {
        return null;
    }

    const ALIGNMENT = toBooleanSafe(
        button.isRight
    ) ? vscode.StatusBarAlignment.Right : vscode.StatusBarAlignment.Left;

    let priority = parseInt(
        toStringSafe(button.priority)
            .trim()
    );
    if (isNaN(priority)) {
        priority = undefined;
    }

    const NEW_BUTTON = vscode.window.createStatusBarItem(
        ALIGNMENT, priority
    );

    let color: string | vscode.ThemeColor = normalizeString(
        button.color
    ).trim();
    if ('' === color) {
        color = new vscode.ThemeColor('button.foreground');
    }

    let text = toStringSafe(
        button.text
    ).trim();
    if ('' === text) {
        text = undefined;
    }

    let tooltip = toStringSafe(
        button.tooltip
    ).trim();
    if ('' === tooltip) {
        tooltip = undefined;
    }

    NEW_BUTTON.color = color;
    NEW_BUTTON.text = text;
    NEW_BUTTON.tooltip = tooltip;

    if (setup) {
        setup(
            NEW_BUTTON, button
        );
    }

    if (_.isString(NEW_BUTTON.color)) {
        if (!NEW_BUTTON.color.startsWith('#')) {
            NEW_BUTTON.color = '#' + NEW_BUTTON.color;
        }
    }

    return NEW_BUTTON;
}

/**
 * Calculates the bearing between two locations.
 *
 * @param {number} lat1 The latitude of the 1st location.
 * @param {number} lng1 The longitude of the 1st location.
 * @param {number} lat2 The latitude of the 2nd location.
 * @param {number} lng2 The longitude of the 2nd location.
 *
 * @return {number} The bearing, in degree.
 */
export function calcBearing(
   lat1: number, lng1: number,
   lat2: number, lng2: number,
): number {
    const D_LNG = lng2 - lng1;
    const Y = Math.sin(D_LNG) * Math.cos(lat2);
    const X = Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(D_LNG);
    const B_RNG = toDegree(Math.atan2(Y, X));

    return 360 - ((B_RNG + 360) % 360);
}

/**
 * Creates the extension's folder in the home directory, if it does not exist.
 *
 * @return {Promise<boolean>} The promise that indicates if directory has been created or not.
 */
export async function createExtensionDirectoryIfNeeded(): Promise<boolean> {
    const DIR = getExtensionDirInHome();
    if (!(await exists(DIR))) {
        await fsExtra.mkdirs(DIR);

        return true;
    }

    return false;
}

/**
 * Creates the extension's folder in the home directory, if it does not exist (synchronously).
 *
 * @return {boolean} Indicates if directory has been created or not.
 */
export function createExtensionDirectoryIfNeededSync(): boolean {
    const DIR = getExtensionDirInHome();
    if (!fsExtra.existsSync(DIR)) {
        fsExtra.mkdirsSync(DIR);

        return true;
    }

    return false;
}

/**
 * Checks if a conditional object does match items condition.
 *
 * @param {ego_contracts.Conditional} obj The object to check.
 *
 * @return {boolean} Matches condition or not.
 */
export function doesMatchFilterCondition(obj: ego_contracts.Conditional): boolean {
    return filterConditionals(
        obj
    ).length > 0;
}

/**
 * Checks if a platform object does match the (current) platform.
 *
 * @param {ego_contracts.Conditional} obj The object to check.
 *
 * @return {boolean} Matches condition or not.
 */
export function doesMatchPlatformCondition(obj: ego_contracts.ForPlatforms): boolean {
    return filterForPlatform(
        obj
    ).length > 0;
}

/**
 * Converts an error value to a string.
 *
 * @param {any} err The error.
 *
 * @return {string} The error as string.
 */
export function errorToString(err: any): string {
    if (err) {
        if (err instanceof Error) {
            return `[${ err.name }] '${ err.message }'`;
        } else {
            return toStringSafe(err);
        }
    }

    return '';
}

/**
 * Escapes a value for handling as safe Markdown text.
 *
 * @param {any} val The input value.
 *
 * @return {string} The escaped value.
 */
export function escapeMarkdown(val: any): string {
    val = toStringSafe(val);

    const ESCAPES: string[] = markdownEscapes({
        gfm: true,
    });
    let result = '';
    for (let i = 0; i < val.length; i++) {
        const C: string = val[i];

        result += (
            ESCAPES.indexOf(C) > -1 ? "\\" : ''
        ) + C;
    }

    return result;
}

/**
 * Executes the code in 'onEditorChanged' of an object.
 *
 * @param {TObj|TObj[]} objs One or more objects.
 * @param {Function} [codeExecutor] A custom code executor.
 */
export function executeOnEditorChangedEvents<
    TObj extends ego_contracts.WithEditorChangedEvents,
>(
    objs: TObj | TObj[],
    codeExecutor?: (code: string, obj: TObj) => any,
) {
    if (arguments.length < 2) {
        codeExecutor = (code, o) => {
            return require('./extension').executeCode(
                code,
                [
                    {
                        'name': 'object',
                        'value': o,
                    }
                ]
            );
        };
    }

    objs = asArray(objs);

    objs.forEach(o => {
        try {
            const CODE = toStringSafe(o.onEditorChanged);
            if ('' !== CODE) {
                codeExecutor(
                    CODE, o
                );
            }
        } catch (e) {
            require('./log').CONSOLE
                .trace(e, 'helpers.executeOnEditorChangedEvents(1)');
        }
    });
}

/**
 * Filters "conditional" items.
 *
 * @param {TObj|TObj[]} objs The objects to check.
 *
 * @return {TObj[]} The filtered items.
 */
export function filterConditionals<TObj extends ego_contracts.Conditional = ego_contracts.Conditional>(
    objs: TObj | TObj[]
): TObj[] {
    return asArray(objs).filter(o => {
        try {
            const IF = toStringSafe(o.if);
            if ('' !== IF.trim()) {
                return toBooleanSafe(
                    ego_code.run({
                        code: IF,
                    }),
                    true
                );
            }

            return true;
        } catch (e) {
            require('./log').CONSOLE
                .trace(e, 'helpers.filterConditionals(1)');

            return false;
        }
    });
}

/**
 * Filters "platform" items.
 *
 * @param {TObj|TObj[]} objs The objects to check.
 *
 * @return {TObj[]} The filtered items.
 */
export function filterForPlatform<TObj extends ego_contracts.ForPlatforms>(
    objs: TObj | TObj[]
): TObj[] {
    return asArray(objs).filter(o => {
        const OBJ_PLATFORMS = asArray(o.platforms).map(p => {
            return normalizeString(p);
        });

        return OBJ_PLATFORMS.length < 1 ? true
            : OBJ_PLATFORMS.indexOf(process.platform) > -1;
    });
}

/**
 * Returns the (possible path) of the extension's global apps sub folder.
 *
 * @return {string} The path of the extension's global apps sub folder.
 */
export function getAppsDir(): string {
    return path.resolve(
        path.join(getExtensionDirInHome(),
                  ego_contracts.APPS_SUBFOLDER)
    );
}

/**
 * Returns the (possible path) of the extension's sub folder inside the home directory.
 *
 * @return {string} The path of the extension's sub folder inside the home directory.
 */
export function getExtensionDirInHome(): string {
    return path.resolve(
        path.join(os.homedir(),
                  ego_contracts.HOMEDIR_SUBFOLDER)
    );
}

/**
 * Gets the initial state value from an object.
 *
 * @param {ego_contracts.WithState} obj The object with the value.
 * @param {any} [defaultValue] The custom default value.
 *
 * @return {any} The initial state value.
 */
export function getInitialStateValue(obj: ego_contracts.WithState, defaultValue: any = {}): any {
    let state: any;
    if (!_.isNil(obj)) {
        state = cloneObject(
            obj.state
        );
    }

    return _.isUndefined(state) ? defaultValue
        : state;
}

/**
 * Imports values to an object.
 *
 * @param {TObj} obj The object where to import the values in.
 * @param {ego_contracts.ValueProvider} valueProvider The function that provides the value instances.
 * @param {boolean} [clone] Clone input object or not. Default: (true)
 *
 * @return {TObj} The object that contains the imported values.
 */
export function importValues<TObj extends ego_contracts.CanImportValues = ego_contracts.CanImportValues>(
    obj: TObj,
    valueProvider: ego_contracts.ValueProvider,
    clone?: boolean,
): TObj {
    clone = toBooleanSafe(clone, true);

    const CLONED_OBJ = clone ? cloneObject(obj)
        : obj;

    const VALUES = asArray(
        valueProvider()
    );

    if (CLONED_OBJ) {
        const IMPORT_VALUES = CLONED_OBJ.importValues;
        if (!_.isNil(IMPORT_VALUES)) {
            for (const P in IMPORT_VALUES) {
                const PROPERTY = toStringSafe(P).trim();

                if ('' === PROPERTY) {
                    continue;
                }
                if (['if', 'importValues', 'platforms'].indexOf(PROPERTY) > -1) {
                    continue;  // these are "critical" properties
                }

                const VALUE_NAME: string = IMPORT_VALUES[PROPERTY];

                VALUES.filter(v => {
                    return normalizeString(v.name) === normalizeString(VALUE_NAME);
                }).forEach(v => {
                    CLONED_OBJ[PROPERTY] = v.value;
                });
            }
        }
    }

    return CLONED_OBJ;
}

/**
 * Checks if an object is visible for an active editor.
 *
 * @param {ego_contracts.ConditionalForActiveEditor} obj The object to check.
 *
 * @return {boolean} Is visible or not.
 */
export function isVisibleForActiveEditor(obj: ego_contracts.ConditionalForActiveEditor): boolean {
    if (!_.isNil(obj)) {
        try {
            const PATTERN = toStringSafe(obj.ifFile);
            if ('' === PATTERN) {
                return true;  // no pattern defined
            }

            const REGEX = new RegExp(PATTERN);

            let fileName: string;

            const EDITOR = vscode.window.activeTextEditor;
            if (EDITOR) {
                const DOC = EDITOR.document;
                if (DOC) {
                    fileName = DOC.fileName;
                }
            }

            fileName = toStringSafe(fileName)
                .split(path.sep)
                .join('/');

            return REGEX.test(fileName);
        } catch (e) {
            require('./log').CONSOLE
                .trace(e, 'helpers.isVisibleForActiveEditor(1)');
        }
    }

    return false;
}

/**
 * Loads a module from a script.
 *
 * @param {string} file The path to the script.
 * @param {boolean} [fromCache] Cache module or not. Default: (false)
 *
 * @return {TModule} The loaded module.
 */
export function loadScriptModule<TModule>(file: string, fromCache = false): TModule {
    file = toStringSafe(file);
    if (isEmptyString(file)) {
        file = './module.js';
    }
    if (!path.isAbsolute(file)) {
        file = path.join(getExtensionDirInHome(), file);
    }
    file = require.resolve(file);

    fromCache = toBooleanSafe(fromCache);

    if (!fromCache) {
        delete require.cache[file];
    }

    return require(file);
}

/**
 * Imports a module from the extension's context.
 *
 * @param {string} id The ID of the module.
 *
 * @return {TModule} The module.
 */
export function requireModule<TModule = any>(id: string): TModule {
    return require(
        toStringSafe(id)
    );
}

/**
 * Shows an error message.
 *
 * @param {any} err The message to show.
 *
 * @return {Promise<string>} The promise with the result.
 */
export async function showErrorMessage(err: any): Promise<string> {
    if (err) {
        return await vscode.window.showErrorMessage(
            errorToString(err).trim()
        );
    }
}

/**
 * Converts a button to a button object, which can be used in code.
 *
 * @param {ego_contracts.GlobalButton} btn The input object.
 * @param {Function} [valueReplacer] A custom value replacer.
 *
 * @return {ego_contracts.CodeButton} The output object.
 */
export function toCodeButton(
    btn: ego_contracts.GlobalButton,
    valueReplacer?: (val: any) => string,
): ego_contracts.CodeButton {
    if (arguments.length < 2) {
        valueReplacer = (val: any) => {
            return require('./global/values')
                .replaceValues(val);
        };
    }

    if (_.isNil(btn)) {
        return <any>btn;
    }

    const STATUS_BTN: vscode.StatusBarItem = btn['__status_item'];
    if (_.isNil(STATUS_BTN)) {
        return <any>STATUS_BTN;
    }

    const BTN_ITEM: ego_contracts.Button = btn['__item'];
    const CMD_ID: string = _.isUndefined(btn['__command']) ?
        STATUS_BTN.command : btn['__command'];

    let unparsedColor = BTN_ITEM ? BTN_ITEM.color
        : STATUS_BTN.color;
    let unparsedText = BTN_ITEM ? BTN_ITEM.text
        : STATUS_BTN.text;
    let unparsedTooltip = BTN_ITEM ? BTN_ITEM.tooltip
        : STATUS_BTN.tooltip;

    const CODE_BTN: ego_contracts.CodeButton = {
        color: undefined,
        disable: function() {
            STATUS_BTN.command = undefined;
        },
        enable: function() {
            STATUS_BTN.command = CMD_ID;
        },
        hide: function() {
            STATUS_BTN.hide();
        },
        show: function() {
            STATUS_BTN.show();
        },
        text: undefined,
        tooltip: undefined,
        update: function() {
            const NEW_COLOR = valueReplacer(unparsedColor);
            if (STATUS_BTN.color !== NEW_COLOR) {
                STATUS_BTN.color = NEW_COLOR;
            }

            const NEW_TEXT = valueReplacer(unparsedText);
            if (STATUS_BTN.text !== NEW_TEXT) {
                STATUS_BTN.text = NEW_TEXT;
            }

            const NEW_TOOLTIP = valueReplacer(unparsedTooltip);
            if (STATUS_BTN.tooltip !== NEW_TOOLTIP) {
                STATUS_BTN.tooltip = NEW_TOOLTIP;
            }
        },
    };

    // CODE_BTN.color
    Object.defineProperty(CODE_BTN, 'color', {
        get: () => {
            return unparsedColor;
        },
        set: (newValue: any) => {
            unparsedColor = newValue;

            CODE_BTN.update();
        }
    });

    // CODE_BTN.text
    Object.defineProperty(CODE_BTN, 'text', {
        get: () => {
            return unparsedText;
        },
        set: (newValue: any) => {
            unparsedText = newValue;

            CODE_BTN.update();
        }
    });

    // CODE_BTN.tooltip
    Object.defineProperty(CODE_BTN, 'tooltip', {
        get: () => {
            return unparsedTooltip;
        },
        set: (newValue: any) => {
            unparsedTooltip = newValue;

            CODE_BTN.update();
        }
    });

    return CODE_BTN;
}

/**
 * Converts radian to degree.
 *
 * @param {number} rad The value, in radian.
 *
 * @return {number} The value, in degree.
 */
export function toDegree(rad: number): number {
    rad = parseFloat(
        toStringSafe(rad).trim()
    );

    return rad * 180 / Math.PI;
}

/**
 * Updates a command script arguments object by an execution context.
 *
 * @param {ego_contracts.GlobalCommandScriptArguments} args The script arguments.
 * @param {ego_contracts.CommandExecutionContext} context The execution context.
 */
export function updateCommandScriptArgumentsByExecutionContext(
    args: ego_contracts.GlobalCommandScriptArguments,
    context: ego_contracts.CommandExecutionContext,
) {
    if (context) {
        // args.source
        Object.defineProperty(args, 'source', {
            enumerable: true,
            get: () => {
                return context.source;
            },
        });

        if (ego_contracts.CommandExecutionSource.File === context.source) {
            args['file'] = context.data['file'];
        } else if (ego_contracts.CommandExecutionSource.Folder === context.source) {
            args['folder'] = context.data['folder'];
        }
    }
}
