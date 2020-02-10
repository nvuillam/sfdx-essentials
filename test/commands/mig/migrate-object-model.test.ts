import { expect, test } from '@salesforce/command/lib/test';

describe('essentials:mig:migrate-object-model', () => {
    test
        .stdout()
        .command(['essentials:mig:migrate-object-model',
            '-c', 'test/commands/mig/migrate-object-model-config.json'
        ]
        )
        .it('essentials:mig:migrate-object-model', (ctx) => {
            expect(ctx.stdout).to.contain('');
        });
});

describe('(alias) essentials:migrate-object-model', () => {
    test
        .stdout()
        .command(['essentials:migrate-object-model',
            '-c', 'test/commands/mig/migrate-object-model-config.json'
        ]
        )
        .it('essentials:migrate-object-model', (ctx) => {
            expect(ctx.stdout).to.contain('');
        });
});



