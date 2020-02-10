import { expect, test } from '@salesforce/command/lib/test';

describe('essentials:project:check-consistency-with-packagexml', () => {
    test
        .stdout()
        .command(['essentials:project:check-consistency-with-packagexml',
            '-i', 'test/shared/sfdxProject/force-app/main/default',
            '-p', 'test/shared/packagexml/package1.xml,test/shared/packagexml/package2.xml',
            '-d', 'Document,EmailTemplate',
            '--failIfError'
        ]
        )
        .it('essentials:project:check-consistency-with-packagexml', (ctx) => {
            expect(ctx.stdout).to.contain('');
        });
});

describe('(alias) essentials:check-sfdx-project-consistency', () => {
    test
        .stdout()
        .command(['essentials:check-sfdx-project-consistency',
            '-i', 'test/shared/sfdxProject/force-app/main/default',
            '-p', 'test/shared/packagexml/package1.xml,test/shared/packagexml/package2.xml',
            '-d', 'Document,EmailTemplate',
            '--failIfError'
        ]
        )
        .it('essentials:check-sfdx-project-consistency', (ctx) => {
            expect(ctx.stdout).to.contain('');
        });
});