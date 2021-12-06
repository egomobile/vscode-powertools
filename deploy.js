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

const child_process = require('child_process');
const ovsx = require('ovsx');
const vsce = require('vsce');

async function deployToMarketplace(pat) {
    await vsce.publish({
        cwd: __dirname,
        pat,
        useYarn: false,
    });
}

async function deployToOpenVSX(token) {
    await ovsx.publish({
        packagePath: cwd,
        pat: token,
        yarn: false,
    });
}

(async () => {
    try {
        const VSCE_AUTH_TOKEN = process.env.VSCE_AUTH_TOKEN.trim();
        if ('' === VSCE_AUTH_TOKEN) {
            throw new Error(`No Personal Access Token in 'VSCE_AUTH_TOKEN' defined!`);
        }

        const OPENVSX_SECRET = process.env.OPENVSX_SECRET.trim();
        if ('' === OPENVSX_SECRET) {
            throw new Error(`No Open VSX Access Token in 'OPENVSX_SECRET' defined!`);
        }

        await deployToMarketplace(VSCE_AUTH_TOKEN);
        await deployToOpenVSX(OPENVSX_SECRET);
    } catch (e) {
        console.error(e);

        process.exit(1);
    }
})();