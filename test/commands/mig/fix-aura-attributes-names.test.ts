import { expect, test } from '@salesforce/command/lib/test';

describe('essentials:mig:fix-aura-attributes-names', () => {
    test
        .stdout()
        .command(['essentials:mig:fix-aura-attributes-names',
            '-f', './test/shared/sfdxProject/force-app/main/default'
        ]
        )
        .it('essentials:mig:fix-aura-attributes-names', (ctx) => {
            expect(ctx.stdout).to.contain('');
        });
});

describe('(alias) essentials:fix-lightning-attribute-names', () => {
    test
        .stdout()
        .command(['essentials:fix-lightning-attribute-names',
            '-f', './test/shared/sfdxProject/force-app/main/default'
        ]
        )
        .it('essentials:fix-lightning-attribute-names', (ctx) => {
            expect(ctx.stdout).to.contain('');
        });
});

