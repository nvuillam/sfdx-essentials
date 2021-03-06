import { expect, test } from '@salesforce/command/lib/test';

describe('essentials:packagexml:append', () => {
    test
        .stdout()
        .command(['essentials:packagexml:remove',
            '-p', './test/shared/packagexml/package1.xml',
            '-r', 'test/shared/packagexml/destructiveChanges.xml',
            '-o', './test/tmp/package1minus2.xml']
        )
        .it('runs essentials:packagexml:remove', (ctx) => {
            expect(ctx.stdout).to.contain('');
        });
});

describe('essentials:packagexml:append (2)', () => {
    test
        .stdout()
        .command(['essentials:packagexml:remove',
            '-p', './test/shared/packagexml/package1.xml',
            '-r', 'test/shared/packagexml/destructiveChanges2.xml',
            '-o', './test/tmp/package1minus2_2.xml']
        )
        .it('runs essentials:packagexml:remove', (ctx) => {
            expect(ctx.stdout).to.contain('');
        });
});