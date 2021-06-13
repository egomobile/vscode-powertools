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

import { TextDecoder, TextEncoder } from 'util';
import { AxiosInstance, AxiosResponse } from 'axios';
import * as moment from 'moment';
import * as vscode from 'vscode';

interface IExecuteNotebookCellOptions {
    cell: vscode.NotebookCell;
    code: string;
    execution: vscode.NotebookCellExecution;
    extension: vscode.ExtensionContext;
    notebook: vscode.NotebookDocument;
    output: vscode.OutputChannel;
}

interface IExecuteNotebookCellResult {
    output: vscode.NotebookCellOutput;
    result: any;
}

/**
 * Inits notebooks feature.
 *
 * @param {vscode.ExtensionContext} extension The extension context.
 * @param {vscode.OutputChannel} outputChannel The output channel.
 */
export function initNotebooks(
    extension: vscode.ExtensionContext,
    outputChannel: vscode.OutputChannel,
) {
    extension.subscriptions.push(
        // serialize/deserialize notebook
        vscode.workspace.registerNotebookSerializer(
            'egobook',
            new EgoNotebookSerializer(),
        )
    );

    // notebook controller
    vscode.notebooks.createNotebookController(
        'egobookController',
        'egobook',
        'Power Tools Notebook',
        async (cells, notebook, controller) => {
            for (let cell of cells) {
                const execution = controller.createNotebookCellExecution(cell);
                execution.start(moment.utc().valueOf());

                let success = true;
                let endTime: moment.Moment;
                try {
                    const code = cell.document.getText();

                    const { output } = await executeNotebookCell_215681ac10354ef688493a03f8172f6d({
                        cell,
                        code,
                        execution,
                        extension,
                        notebook,
                        output: outputChannel,
                    });

                    endTime = moment.utc();

                    execution.replaceOutput(output);
                } catch (e) {
                    endTime = moment.utc();

                    success = false;

                    let error: Error = e;
                    if (!(error instanceof Error)) {
                        error = new Error(`${e}`);
                    }

                    const errorOutputItem = vscode.NotebookCellOutputItem.error(error);

                    const errorOutput = new vscode.NotebookCellOutput([errorOutputItem]);

                    execution.replaceOutput(errorOutput);
                } finally {
                    execution.end(success, endTime.valueOf());
                }
            }
        }
    );
}

class EgoNotebookHttpRequestError extends Error {
    public constructor(
        public readonly response: AxiosResponse,
        message?: string
    ) {
        super(message || `Server returned status code ${response.status}`);
    }
}

class EgoNotebookSerializer implements vscode.NotebookSerializer {
    public deserializeNotebook(content: Uint8Array): vscode.NotebookData {
        const jsonStr = (new TextDecoder().decode(content)).trim();
        if (!jsonStr.length) {
            return {
                cells: [],
            };
        }

        return JSON.parse(jsonStr);
    }

    public serializeNotebook(data: vscode.NotebookData): Uint8Array {
        return new TextEncoder().encode(JSON.stringify(data));
    }
}

async function executeNotebookCell_215681ac10354ef688493a03f8172f6d(_6e526da69a9f4bb791d2ba5f64e7ab48: IExecuteNotebookCellOptions): Promise<IExecuteNotebookCellResult> {
    // notebook cell output items
    const _fe5723d320884bc597386086ba5f1316: vscode.NotebookCellOutputItem[] = [];

    const _ = require('lodash');
    const $axios = require('axios').default;
    // @ts-ignore
    const $helpers = require('./helpers');
    // @ts-ignore
    const $moment = require('moment');
    // @ts-ignore
    const $vscode = require('vscode');

    // @ts-ignore
    const _df6b10feb8864ba68a10b59da0ff0fa1: AxiosInstance = $axios.create({
        validateStatus: () => true,
    });

    const $str = (val: any): string => {
        if (typeof val === 'string') {
            return val;
        }

        if (_.isNil(val)) {
            return '';
        }

        if (Buffer.isBuffer(val)) {
            return val.toString('utf8');
        }

        if (typeof val['toString'] === 'function') {
            return String(val.toString());
        }

        if (typeof val['toString'] === 'object') {
            return JSON.stringify(val, null, 2);
        }

        return String(val);
    };

    const $request = (method: any, url: any, ...args: any[]) => {
        method = $str(method).toLowerCase().trim();
        url = $str(url);

        let data: any;
        let headers: any;
        if (method === '' || method === 'get') {
            headers = args[0];
        } else {
            data = args[0];
            headers = args[1];
        }

        return _df6b10feb8864ba68a10b59da0ff0fa1.request({
            url,
            method,
            headers,
            data,
            responseType: 'arraybuffer'
        });
    };

    // wrapper for $request, that returns the response
    // data directly, if no error
    //
    // otherwise an exception is thrown
    const _9cf0115f617d4a87848db0a649c4bfd4 = async (...args: any[]) => {
        const contentType = require('content-type');

        const response: AxiosResponse = await ($request as any)(...args);

        if (response.status >= 400) {
            throw new EgoNotebookHttpRequestError(response);
        }

        let data: any = response.data;

        let charset: string | null | undefined;
        let type: string | null | undefined;
        try {
            const mime = contentType.parse(
                $str(response.headers['content-type']).toLowerCase().trim()
            );

            charset = mime.parameters?.['charset'];
            charset = mime.type;
        } catch { }

        charset = charset?.toLowerCase().trim();
        type = type?.toLowerCase().trim();

        if (!charset?.length) {
            charset = 'utf8';
        }
        if (!type?.length) {
            type = 'application/octet-stream';
        }

        if (Buffer.isBuffer(data)) {
            if (type.endsWith('/json')) {
                try {
                    data = JSON.parse(data.toString('utf8'));
                } catch { }
            }
        }

        return data;
    };

    // @ts-ignore
    const $delete = (url: any, data?: any, headers?: any) => {
        return _9cf0115f617d4a87848db0a649c4bfd4('delete', url, data, headers);
    };
    // @ts-ignore
    const $get = (url: any, headers?: any) => {
        return _9cf0115f617d4a87848db0a649c4bfd4('get', url, headers);
    };
    // @ts-ignore
    const $patch = (url: any, data?: any, headers?: any) => {
        return _9cf0115f617d4a87848db0a649c4bfd4('patch', url, data, headers);
    };
    // @ts-ignore
    const $post = (url: any, data?: any, headers?: any) => {
        return _9cf0115f617d4a87848db0a649c4bfd4('post', url, data, headers);
    };
    // @ts-ignore
    const $put = (url: any, data?: any, headers?: any) => {
        return _9cf0115f617d4a87848db0a649c4bfd4('put', url, data, headers);
    };

    // @ts-ignore
    const $csv = (csv: any, delimiter: any = ';', newLine: any = '\n') => {
        csv = $str(csv);
        delimiter = $str(delimiter);
        newLine = $str(newLine);

        return async () => {
            const rows = await loadCSV_c8b508472ba64ecd8fb7d5671c0a33ec(csv, delimiter, newLine);
            const html = toHTMLTable_0d937cb5e098468fb621b65f5d2c6506(rows);

            _fe5723d320884bc597386086ba5f1316.push(
                vscode.NotebookCellOutputItem.text(html, 'text/html')
            );
        };
    };

    // @ts-ignore
    const $val = function (name: any, newValue?: any) {
        const key = $str(name).toLowerCase().trim();

        if (arguments.length < 2) {
            return _6e526da69a9f4bb791d2ba5f64e7ab48.notebook.metadata[key];
        }

        return new Promise<void>(async () => {
            let value: any = await Promise.resolve(newValue);
            if (typeof value === 'function') {
                value = await Promise.resolve(value(name));
            }

            if (typeof value === 'undefined') {
                delete _6e526da69a9f4bb791d2ba5f64e7ab48.notebook.metadata[key];
            } else {
                _6e526da69a9f4bb791d2ba5f64e7ab48.notebook.metadata[key] = value;
            }
        });
    };
    // @ts-ignore
    const $unset = (name: any) => $val(name, undefined);

    // @ts-ignore
    const $setHtml = (html: any) => {
        html = $str(html);

        const newHtmlOutputItem = vscode.NotebookCellOutputItem.text(html, 'text/html');

        let htmlOutputIndex = _fe5723d320884bc597386086ba5f1316.findIndex(o => o.mime === 'text/html');
        if (htmlOutputIndex > -1) {
            _fe5723d320884bc597386086ba5f1316[htmlOutputIndex] = newHtmlOutputItem;
        } else {
            _fe5723d320884bc597386086ba5f1316.push(newHtmlOutputItem);
        }
    };
    // @ts-ignore
    const $setMarkdown = (md: any) => {
        md = $str(md);

        const html: string = (new (require('showdown').Converter)())
            .makeHtml(md);

        return $setHtml(html);
    };

    // @ts-ignore
    const $setText = (text: any) => {
        text = $helpers.toStringSafe(text);

        const newTextOutputItem = vscode.NotebookCellOutputItem.text(text, 'text/plain');

        let textOutputIndex = _fe5723d320884bc597386086ba5f1316.findIndex(o => o.mime === 'text/plain');
        if (textOutputIndex > -1) {
            _fe5723d320884bc597386086ba5f1316[textOutputIndex] = newTextOutputItem;
        } else {
            _fe5723d320884bc597386086ba5f1316.push(newTextOutputItem);
        }
    };

    // code executor
    let _9deb012f277841a0995c1094c786c829: () => Promise<any>;
    switch ($str(_6e526da69a9f4bb791d2ba5f64e7ab48.cell.document.languageId).toLowerCase().trim()) {
        case 'coffeescript':
            {
                const coffeeScript = require('coffeescript');

                _9deb012f277841a0995c1094c786c829 = () => {
                    const runScriptCode = $str(_6e526da69a9f4bb791d2ba5f64e7ab48.code)
                        .split('\n')
                        .map(l => '    ' + l)
                        .join('\n');

                const coffeeCode = `runScript_64ac464361e745b0851776eaab1c0dec = (tm_f6cf0fe2217144cd870d1af86a71a2be) ->
${runScriptCode}

return runScript_64ac464361e745b0851776eaab1c0dec 19790905`;

                const jsCode = coffeeScript.compile(coffeeCode, {
                    bare: true,
                });

                return eval(`(async () => {

${jsCode}

})()`);
                };
            }
            break;

        default:
            // default: JavaScript
            _9deb012f277841a0995c1094c786c829 = () => eval(`(async () => {

${$str(_6e526da69a9f4bb791d2ba5f64e7ab48.code)}

})()`);
            break;
    }

    // execute code
    let result: any = await Promise.resolve(_9deb012f277841a0995c1094c786c829());

    if (!_.isNil(result)) {
        if (typeof result === 'function') {
            result = await Promise.resolve(result());
        }

        const addAsTextResult = () => {
            const newTextOutputItem = vscode.NotebookCellOutputItem.text($str(result));

            _fe5723d320884bc597386086ba5f1316.push(newTextOutputItem);
        };

        if (Buffer.isBuffer(result)) {
            const fileType = require('file-type');

            try {
                const type = await fileType.fromBuffer(result);

                const mime = $str(type.mime).toLowerCase().trim();

                if (mime.startsWith('image/')) {  // display as image?
                    const dataUrl = `data:${mime};base64,${result.toString('base64')}`;
                    const html = `<img src="${dataUrl}" style="max-width: 800px; max-height: 600px;" />`;

                    _fe5723d320884bc597386086ba5f1316.push(
                        vscode.NotebookCellOutputItem.text(html, 'text/html')
                    );
                } else {
                    addAsTextResult();
                }
            } catch (ex) {
                addAsTextResult();
            }
        } else if (typeof result === 'object') {
            const newJsonOutputItem = vscode.NotebookCellOutputItem.json(result);

            _fe5723d320884bc597386086ba5f1316.push(newJsonOutputItem);
        } else {
            addAsTextResult();
        }
    }

    // define output
    const output = new vscode.NotebookCellOutput(_fe5723d320884bc597386086ba5f1316);

    return {
        output,
        result,
    };
}

async function loadCSV_c8b508472ba64ecd8fb7d5671c0a33ec(
    csv: string, delimiter: string, newLine: string
): Promise<string[][]> {
    const rows: string[][] = [];

    csv.split(newLine).forEach(line => {
        const newRow: string[] = [];

        newRow.push(...line.split(delimiter));

        rows.push(newRow);
    });

    return rows;
}

function toHTMLTable_0d937cb5e098468fb621b65f5d2c6506(rows: any[][]): string {
    const helpers = require('./helpers');

    let html = '';

    html += '<table>';
    html += '<tbody>';
    rows.filter(r => Array.isArray(r)).forEach((row: any[], index: number) => {
        html += '<tr>';
        if (row) {
            const cellTag = index > 0 ? 'td' : 'th';

            html += `<${cellTag}>${ index + 1 }</${cellTag}>`;

            row.forEach(cell => {
                html += `<${cellTag}>`;
                html += helpers.escapeMarkdown(cell);
                html += `</${cellTag}>`;
            });
        }
        html += '</tr>';
    });
    html += '</tbody>';
    html += '</table>';

    return html;
}
