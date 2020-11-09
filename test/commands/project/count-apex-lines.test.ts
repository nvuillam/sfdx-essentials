import { expect, test } from '@salesforce/command/lib/test';

describe('essentials:project:count-apex-lines without packageXml', () => {
    test
        .stdout()
        .command(['essentials:project:count-apex-lines',
            '-f', './test/shared/sfdxProject/force-app/main/default'
        ]
        )
        .it('runs essentials:project:count-apex-lines', (ctx) => {
            expect(ctx.stdout).to.contain('Number of files: [2]');
            expect(ctx.stdout).to.contain('Number of source lines (excluding comments): [303]');
        });
});

describe('essentials:project:count-apex-lines with packageXml', () => {
    test
        .stdout()
        .command(['essentials:project:count-apex-lines',
            '-f', './test/shared/sfdxProject/force-app/main/default',
            '-p', './test/shared/packagexml/package1.xml'
        ]
        )
        .it('runs essentials:project:count-apex-lines', (ctx) => {
            expect(ctx.stdout).to.contain('Number of files: [2]');
            expect(ctx.stdout).to.contain('Number of source lines (excluding comments): [303]');
        });
});

describe('essentials:project:count-apex-lines with packageXml and exclude', () => {
    test
        .stdout()
        .command(['essentials:project:count-apex-lines',
            '-f', './test/shared/sfdxProject/force-app/main/default',
            '-p', './test/shared/packagexml/package1.xml',
            '-e', '(WsMockS)'
        ]
        )
        .it('runs essentials:project:count-apex-lines', (ctx) => {
            expect(ctx.stdout).to.contain('Number of files: [1]');
            expect(ctx.stdout).to.contain('Number of source lines (excluding comments): [134]');
        });
});

describe('essentials:project:count-apex-lines with overridden browsingPattern', () => {
    test
        .stdout()
        .command(['essentials:project:count-apex-lines',
            '-f', './test/shared/sfdxProject/force-app/main/default',
            '-b', '**/WsMockV*.cls'
        ]
        )
        .it('runs essentials:project:count-apex-lines', (ctx) => {
            expect(ctx.stdout).to.contain('Number of files: [1]');
            expect(ctx.stdout).to.contain('Number of source lines (excluding comments): [134]');
        });
});

describe('essentials:project:count-apex-lines with packagexml and browsingPattern', () => {
    test
        .stdout()
        .command(['essentials:project:count-apex-lines',
            '-f', './test/shared/sfdxProject/force-app/main/default',
            '-p', './test/shared/packagexml/package1.xml',
            '-b', '**/WsMockV*.cls'
        ]
        )
        .it('runs essentials:project:count-apex-lines', (ctx) => {
            expect(ctx.stdout).to.contain('Number of files: [1]');
            expect(ctx.stdout).to.contain('Number of source lines (excluding comments): [134]');
        });
});

describe('essentials:project:count-apex-lines with weight', () => {
    test
        .stdout()
        .command(['essentials:project:count-apex-lines',
            '-f', './test/shared/sfdxProject/force-app/main/default',
            '--weight'
        ]
        )
        .it('runs essentials:project:count-apex-lines', (ctx) => {
            expect(ctx.stdout).to.contain('Number of files: [2]');
            expect(ctx.stdout).to.contain('Number of source lines (excluding comments): [303]');
            expect(ctx.stdout).to.contain('Number of characters in source lines (excluding comments): [11413]');
        });
});

describe('essentials:project:count-apex-lines with weight and packageXml', () => {
    test
        .stdout()
        .command(['essentials:project:count-apex-lines',
            '-f', './test/shared/sfdxProject/force-app/main/default',
            '-p', './test/shared/packagexml/package1.xml',
            '--weight'
        ]
        )
        .it('runs essentials:project:count-apex-lines', (ctx) => {
            expect(ctx.stdout).to.contain('Number of files: [2]');
            expect(ctx.stdout).to.contain('Number of source lines (excluding comments): [303]');
            expect(ctx.stdout).to.contain('Number of characters in source lines (excluding comments): [11413]');
        });
});
