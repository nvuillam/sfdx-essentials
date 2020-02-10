
import { expect, test } from '@salesforce/command/lib/test';

describe('essentials:permissionset:generate', () => {
  test
    .stdout()
    .command(['essentials:permissionset:generate',
      '-c', './test/commands/permissionset/generate-permission-sets-config.json',
      '-p', './test/shared/packagexml/package1.xml',
      '-f', './test/shared/sfdxProject/force-app/main/default',
      '-o', './test/shared/sfdxProject/force-app/main/default/permissionsets'])
    .it('runs permissionset:generate', (ctx) => {
      expect(ctx.stdout).to.contain('Administrator');
    });
});

describe('(alias) essentials:generate-permission-sets', () => {
  test
    .stdout()
    .command(['essentials:generate-permission-sets',
      '-c', './test/commands/permissionset/generate-permission-sets-config.json',
      '-p', './test/shared/packagexml/package1.xml',
      '-f', './test/shared/sfdxProject/force-app/main/default',
      '-o', './test/shared/sfdxProject/force-app/main/default/permissionsets'])
    .it('runs permissionset:generate', (ctx) => {
      expect(ctx.stdout).to.contain('Administrator');
    });
}); 