import { expect, test } from '@salesforce/command/lib/test';

describe('essentials:metadata:filter-xml-content', () => {
    test
        .stdout()
        .command(['essentials:metadata:filter-xml-content',
            '-i', 'test/shared/mdapioutput',
            '-c', 'test/commands/metadata/filter-xml-content-config.json',
            '-o', 'test/tmp/mdapioutputFilteredXml',
        ])
        .it('runs essentials:metadata:filter-xml-content', (ctx) => {
            expect(ctx.stdout).to.contain('InsuranceAdmin.permissionset":{"updated":true');
        });
});

describe('(alias) essentials:filter-xml-content', () => {
    test
        .stdout()
        .command(['essentials:filter-xml-content',
            '-i', 'test/shared/mdapioutput',
            '-c', 'test/commands/metadata/filter-xml-content-config.json',
            '-o', 'test/tmp/mdapioutputFilteredXml',
        ])
        .it('runs essentials:filter-xml-content', (ctx) => {
            expect(ctx.stdout).to.contain('InsuranceAdmin.permissionset":{"updated":true');
        });
});