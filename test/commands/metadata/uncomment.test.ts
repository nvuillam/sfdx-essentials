import { expect, test } from '@salesforce/command/lib/test';

describe('essentials:metadata:uncomment', () => {
    test
        .stdout()
        .command(['essentials:metadata:uncomment',
            '-f', 'test/shared/mdapioutput'
        ])
        .it('runs essentials:metadata:uncomment', (ctx) => {
            expect(ctx.stdout).to.contain('Total uncomments:');
        });
});

describe('(alias) essentials:uncomment', () => {
    test
        .stdout()
        .command(['essentials:uncomment',
            '-f', 'test/shared/mdapioutput'
        ])
        .it('runs essentials:uncomment', (ctx) => {
            expect(ctx.stdout).to.contain('Total uncomments:');
        });
});