import { expect, test } from '@salesforce/command/lib/test';

describe('essentials:mig:add-namespace', () => {
    test
        .stdout()
        .command(['essentials:mig:add-namespace',
            '-n', 'DxcOemDev',
            '-i', './test/shared/sfdxProject',
            '--fetchExpressionList', '**/*.apex,**/*.json',
            '-p', './test/shared/packagexml/package1.xml'
        ]
        )
        .it('runs essentials:mig:add-namespace', (ctx) => {
            expect(ctx.stdout).to.contain('');
        });
});

