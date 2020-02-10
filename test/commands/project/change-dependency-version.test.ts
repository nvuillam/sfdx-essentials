import { expect, test } from '@salesforce/command/lib/test';

describe('essentials:project:change-dependency-version', () => {
    test
        .stdout()
        .command(['essentials:project:change-dependency-version',
            '-f', 'test/shared/sfdxProject/force-app/main/default',
            '-n', 'FinServ',
            '-j', '214',
            '-m', '7'
        ]
        )
        .it('runs essentials:project:change-dependency-version', (ctx) => {
            expect(ctx.stdout).to.contain('Updated');
        });
});

describe('essentials:project:change-dependency-version (remove package dependency)', () => {
    test
        .stdout()
        .command(['essentials:project:change-dependency-version',
            '-f', 'test/shared/sfdxProject/force-app/main/default',
            '-n', 'FinServ',
            '-r'
        ]
        )
        .it('runs essentials:project:change-dependency-version (remove package dependency)', (ctx) => {
            expect(ctx.stdout).to.contain('Updated');
        });
});

describe('essentials:project:change-dependency-version (change api version)', () => {
    test
        .stdout()
        .command(['essentials:project:change-dependency-version',
            '-f', 'test/shared/sfdxProject/force-app/main/default',
            '-a', '46.0'
        ]
        )
        .it('runs essentials:project:change-dependency-version (change api version)', (ctx) => {
            expect(ctx.stdout).to.contain('Updated');
        });
});

describe('(alias) essentials:change-dependency-version (change api version)', () => {
    test
        .stdout()
        .command(['essentials:project:change-dependency-version',
            '-f', 'test/shared/sfdxProject/force-app/main/default',
            '-a', '46.0'
        ]
        )
        .it('runs essentials:project:change-dependency-version (change api version)', (ctx) => {
            expect(ctx.stdout).to.contain('Updated');
        });
});