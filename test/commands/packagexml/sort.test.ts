import { expect, test } from '@salesforce/command/lib/test';

describe('essentials:packagexml:sort', () => {
    test
        .stdout()
        .command(['essentials:packagexml:sort',
            '-p', 'test/shared/packagexml/package1.xml']
        )
        .it('runs essentials:packagexml:sort', (ctx) => {
            expect(ctx.stdout).to.contain('');
        });
});

describe('essentials:order-package-xml', () => {
    test
        .stdout()
        .command(['essentials:order-package-xml',
            '-p', 'test/shared/packagexml/package1.xml']
        )
        .it('runs essentials:order-package-xml', (ctx) => {
            expect(ctx.stdout).to.contain('');
        });
});

describe('essentials:packagexml:reorder', () => {
    test
        .stdout()
        .command(['essentials:packagexml:reorder',
            '-p', 'test/shared/packagexml/package1.xml']
        )
        .it('runs essentials:packagexml:reorder', (ctx) => {
            expect(ctx.stdout).to.contain('');
        });
});