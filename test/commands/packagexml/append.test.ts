import { expect, test } from '@salesforce/command/lib/test';

describe('essentials:packagexml:append', () => {
    test
        .stdout()
        .command(['essentials:packagexml:append',
            '-p', 'test/shared/packagexml/package1.xml,test/shared/packagexml/package2.xml',
            '-o', 'test/tmp/package1plus2.xml']
        )
        .it('runs essentials:packagexml:append', (ctx) => {
            expect(ctx.stdout).to.contain('');
        });
});

