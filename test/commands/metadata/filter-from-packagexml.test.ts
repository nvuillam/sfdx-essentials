import { expect, test } from '@salesforce/command/lib/test';

describe('essentials:metadata:filter-from-packagexml', () => {
    test
        .stdout()
        .timeout(30000)
        .command(['essentials:metadata:filter-from-packagexml',
            '-i', './test/shared/mdapioutput',
            '-p', './test/shared/packagexml/package1.xml',
            '-o', './test/tmp/mdapioutputFiltered',
        ])
        .it('runs essentials:metadata:filter-from-packagexml', (ctx) => {
            expect(ctx.stdout).to.contain('nbCopied');
        });
});

describe('essentials:metadata:filter-from-packagexml (silent)', () => {
    test
        .stdout()
        .timeout(30000)
        .command(['essentials:metadata:filter-from-packagexml',
            '-i', './test/shared/mdapioutput',
            '-p', './test/shared/packagexml/package1.xml',
            '-o', './test/tmp/mdapioutputFiltered',
            '-s'
        ])
        .it('runs essentials:metadata:filter-from-packagexml', (ctx) => {
            expect(ctx.stdout).to.not.contain('nbCopied');
        });
});

describe('(alias) essentials:filter-metadatas', () => {
    test
        .stdout()
        .command(['essentials:filter-metadatas',
            '-i', './test/shared/mdapioutput',
            '-p', './test/shared/packagexml/package1.xml',
            '-o', './test/tmp/mdapioutputFiltered',
        ])
        .it('runs essentials:filter-metadatas', (ctx) => {
            expect(ctx.stdout).to.contain('nbCopied');
        });
}); 