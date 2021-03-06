class MetadataUtils {

  // Describe packageXml <=> metadata folder correspondance
  public static describeMetadataTypes() {

    // folder is the corresponding folder in metadatas folder
    // nameSuffixList are the files and/or folder names , built from the name of the package.xml item ( in <members> )

    const metadataTypesDescription = {

      // Metadatas to use for copy
      ApexClass: { folder: 'classes', nameSuffixList: ['.cls', '.cls-meta.xml'], sfdxNameSuffixList: ['.cls', '-meta.xml'], permissionSetTypeName: 'classAccesses', permissionSetMemberName: 'apexClass' },
      ApexComponent: { folder: 'components', nameSuffixList: ['.component', '.component-meta.xml'], sfdxNameSuffixList: ['.component', '.component-meta.xml'] },
      ApexPage: { folder: 'pages', nameSuffixList: ['.page', '.page-meta.xml'], sfdxNameSuffixList: ['.page', '-meta.xml'], permissionSetTypeName: 'pageAccesses', permissionSetMemberName: 'apexPage' },
      ApexTrigger: { folder: 'triggers', nameSuffixList: ['.trigger', '.trigger-meta.xml'], sfdxNameSuffixList: ['.trigger', '-meta.xml'] },
      ApprovalProcess: { folder: 'approvalProcesses', nameSuffixList: ['.approvalProcess'], sfdxNameSuffixList: ['.approvalProcess-meta.xml'] },
      AuraDefinitionBundle: { folder: 'aura', nameSuffixList: [''], sfdxNameSuffixList: [''] },
      AuthProvider: { folder: 'authproviders', nameSuffixList: ['.authprovider'], sfdxNameSuffixList: ['.authprovider-meta.xml'] },
      LightningComponentBundle: { folder: 'lwc', nameSuffixList: [''], sfdxNameSuffixList: [''] },
      ContentAsset: { folder: 'contentassets', nameSuffixList: ['.asset', '.asset-meta.xml'], sfdxNameSuffixList: ['.asset', '.asset-meta.xml'] },
      CustomApplication: { folder: 'applications', nameSuffixList: ['.app'], sfdxNameSuffixList: ['.app-meta.xml'], permissionSetTypeName: 'applicationVisibilities', permissionSetMemberName: 'application' },
      CustomLabel: { folder: 'labels', nameSuffixList: ['.labels'], sfdxNameSuffixList: ['.labels-meta.xml'] },
      CustomMetadata: { folder: 'customMetadata', nameSuffixList: ['.md'], sfdxNameSuffixList: ['.md-meta.xml'] },
      CustomMetadataType: { virtual: true, permissionSetTypeName: 'customMetadataTypeAccesses', permissionSetMemberName: 'name' },
      CustomSettings: { virtual: true, permissionSetTypeName: 'customSettingAccesses', permissionSetMemberName: 'name' },
      CustomSite: { folder: 'sites', nameSuffixList: ['.site'], sfdxNameSuffixList: ['.site-meta.xml'] },
      CustomObjectTranslation: { folder: 'objectTranslations', nameSuffixList: ['.objectTranslation'] }, // We use Translations to define the list of objectTranslations to filter & copy
      CustomPermission: { folder: 'customPermissions', nameSuffixList: ['.customPermission'], sfdxNameSuffixList: ['.customPermission-meta.xml'] },
      CustomPlatformEvent: { virtual: true, permissionSetTypeName: 'objectPermissions', permissionSetMemberName: 'object' },
      CustomTab: { folder: 'tabs', nameSuffixList: ['.tab'], sfdxNameSuffixList: ['.tab-meta.xml'], permissionSetTypeName: 'tabSettings', permissionSetMemberName: 'tab' },
      Document: { folder: 'documents', nameSuffixList: ['', '-meta.xml'], sfdxNameSuffixList: ['.documentFolder-meta.xml', '.document-meta.xml', '.png'], metasInSubFolders: true },
      EmailTemplate: { folder: 'email', nameSuffixList: ['', '.email', '.email-meta.xml'], sfdxNameSuffixList: ['.email', '.email-meta.xml'], metasInSubFolders: true },
      EscalationRules: { folder: 'escalationRules', nameSuffixList: ['.escalationRules'], sfdxNameSuffixList: ['.escalationRules-meta.xml'] },
      FlexiPage: { folder: 'flexipages', nameSuffixList: ['.flexipage'], sfdxNameSuffixList: ['.flexipage-meta.xml'] },
      Flow: { folder: 'flows', nameSuffixList: ['.flow'], sfdxNameSuffixList: ['.flow-meta.xml'] },
      GlobalValueSet: { folder: 'globalValueSets', nameSuffixList: ['.globalValueSet'], sfdxNameSuffixList: ['.globalValueSet-meta.xml'] },
      GlobalValueSetTranslation: { folder: 'globalValueSetTranslations', nameSuffixList: ['.globalValueSetTranslation'], sfdxNameSuffixList: ['.globalValueSetTranslation-meta.xml'] },
      HomePageLayout: { folder: 'homePageLayouts', nameSuffixList: ['.homePageLayout'], sfdxNameSuffixList: ['.homePageLayout-meta.xml'] },
      Layout: { folder: 'layouts', nameSuffixList: ['.layout'], sfdxNameSuffixList: ['.layout-meta.xml'] },
      NamedCredential: { folder: 'namedCredentials', nameSuffixList: ['.namedCredential'], sfdxNameSuffixList: ['.namedCredential-meta.xml'] },
      Network: { folder: 'networks', nameSuffixList: ['.network'], sfdxNameSuffixList: ['.network-meta.xml'] },
      NetworkBranding: { folder: 'networkBranding', nameSuffixList: ['', '.networkBranding', '.networkBranding-meta.xml'], sfdxNameSuffixList: ['.networkBranding-meta.xml', '.networkBranding'] },
      NotificationTypeConfig: { folder: 'notificationtypes', nameSuffixList: ['.notiftype'], sfdxNameSuffixList: ['.notiftype-meta.xml'] },
      PermissionSet: { folder: 'permissionsets', nameSuffixList: ['.permissionset'], sfdxNameSuffixList: ['.permissionset-meta.xml'] },
      PlatformCachePartition: { folder: 'cachePartitions', nameSuffixList: ['.cachePartition'], sfdxNameSuffixList: ['.cachePartition-meta.xml'] },
      Profile: { folder: 'profiles', nameSuffixList: ['.profile'], sfdxNameSuffixList: ['.profile-meta.xml'] },
      Queue: { folder: 'queues', nameSuffixList: ['.queue'], sfdxNameSuffixList: ['.queue-meta.xml'] },
      QuickAction: { folder: 'quickActions', nameSuffixList: ['.quickAction'], sfdxNameSuffixList: ['.quickAction-meta.xml'] },
      RemoteSiteSetting: { folder: 'remoteSiteSettings', nameSuffixList: ['.remoteSite'], sfdxNameSuffixList: ['.remoteSite-meta.xml'] },
      Report: { folder: 'reports', nameSuffixList: ['', '-meta.xml'], sfdxNameSuffixList: ['.reportFolder-meta.xml'] },
      Role: { folder: 'roles', nameSuffixList: ['.role'], sfdxNameSuffixList: ['.role-meta.xml'] },
      Settings: { folder: 'settings', nameSuffixList: ['.settings'], sfdxNameSuffixList: ['.settings-meta.xml'] },
      SiteDotCom: { folder: 'siteDotComSites', nameSuffixList: ['.site', '.site-meta.xml'], sfdxNameSuffixList: ['.site', '.site-meta.xml'] },
      StandardValueSet: { folder: 'standardValueSets', nameSuffixList: ['.standardValueSet'], sfdxNameSuffixList: ['.standardValueSet-meta.xml'] },
      StandardValueSetTranslation: { folder: 'standardValueSetTranslations', nameSuffixList: ['.standardValueSetTranslation'], sfdxNameSuffixList: ['.standardValueSetTranslation-meta.xml'] },
      StaticResource: { folder: 'staticresources', nameSuffixList: ['.resource', '.resource-meta.xml'], sfdxNameSuffixList: ['.resource-meta.xml', '.json', '.txt', '.bin', '.js', '.mp3', '.gif'] },
      //      'Translations': { folder: 'translations', nameSuffixList: ['.translation'] }, processed apart, as they need to be filtered
      Workflow: { folder: 'workflows', nameSuffixList: ['.workflow'], sfdxNameSuffixList: ['.workflow-meta.xml'] },

      // Metadatas to use for building objects folder ( SObjects )
      BusinessProcess: { sobjectRelated: true },
      CompactLayout: { sobjectRelated: true },
      CustomField: { sobjectRelated: true, permissionSetTypeName: 'fieldPermissions', permissionSetMemberName: 'field' },
      CustomObject: { sobjectRelated: true, permissionSetTypeName: 'objectPermissions', permissionSetMemberName: 'object' },
      FieldSet: { sobjectRelated: true },
      ListView: { sobjectRelated: true },
      RecordType: { sobjectRelated: true, permissionSetTypeName: 'recordTypeVisibilities', permissionSetMemberName: 'recordType' },
      UserPermission: { sobjectRelated: false, permissionSetTypeName: 'userPermissions', permissionSetMemberName: 'name' },
      ValidationRule: { sobjectRelated: true },
      WebLink: { sobjectRelated: true },

      // Special case: Translations, used for object copy and for filtering
      Translations: { translationRelated: true, folder: 'translations', nameSuffixList: ['.translation'], sfdxNameSuffixList: ['.translation-meta.xml'] }

    };

    return metadataTypesDescription;
  }

  // Describe .object file <=> package.xml formats
  public static describeObjectProperties() {

    const objectFilteringProperties = [
      {
        objectXmlPropName: 'businessProcesses', packageXmlPropName: 'BusinessProcess', nameProperty: 'fullName', translationNameProperty: 'name',
        sfdxNameSuffixList: ['.businessProcess-meta.xml']
      },
      {
        objectXmlPropName: 'compactLayouts', packageXmlPropName: 'CompactLayout', nameProperty: 'fullName', translationNameProperty: 'layout',
        sfdxNameSuffixList: ['.compactLayout-meta.xml']
      },
      {
        objectXmlPropName: 'fields', packageXmlPropName: 'CustomField', nameProperty: 'fullName', translationNameProperty: 'name',
        sfdxNameSuffixList: ['.field-meta.xml']
      },
      {
        objectXmlPropName: 'listViews', packageXmlPropName: 'ListView', nameProperty: 'fullName', translationNameProperty: 'name',
        sfdxNameSuffixList: ['.listView-meta.xml']
      },
      {
        objectXmlPropName: 'layouts', packageXmlPropName: 'Layout', nameProperty: 'fullName', translationNameProperty: 'layout',
        sfdxNameSuffixList: ['.layout-meta.xml']
      },
      {
        objectXmlPropName: 'recordTypes', packageXmlPropName: 'RecordType', nameProperty: 'fullName', translationNameProperty: 'name',
        sfdxNameSuffixList: ['.recordType-meta.xml']
      },
      {
        objectXmlPropName: 'webLinks', packageXmlPropName: 'WebLink', nameProperty: 'fullName', translationNameProperty: 'name',
        sfdxNameSuffixList: ['.webLink-meta.xml']
      },
      {
        objectXmlPropName: 'validationRules', packageXmlPropName: 'ValidationRule', nameProperty: 'fullName', translationNameProperty: 'name',
        sfdxNameSuffixList: ['.validationRule-meta.xml']
      },
      {
        objectXmlPropName: 'fieldSets', packageXmlPropName: 'FieldSet', nameProperty: 'fullName', translationNameProperty: 'name',
        sfdxNameSuffixList: ['.fieldSet-meta.xml']
      }
    ];
    return objectFilteringProperties;
  }

  public static getAroundCharsObjectReplacementList() {
    const aroundCharReplaceObjectList = [
      { name: 'simpleQuote', before: '\'', after: '\'', replacementPrefix: null, replacementSuffix: null },
      { name: 'tag', before: '<', after: '>' },
      { name: 'xmlFile', before: '>', after: '</' },
      { name: 'packageXmlFile', before: '>', after: '.' },
      { name: 'stringlist', before: '\'', after: '.' }, // ClassName.MEthodNmae('MyObject.Myfield');
      { name: 'space', before: ' ', after: ' ' },
      { name: 'spacePoint', before: ' ', after: '.' }, // Database.upsert( objectList, fieldobject.Fields.fieldName__c,false) ;
      { name: 'parenthesis', before: '\(', after: '\)' },
      { name: 'loop', before: '\(', after: '\ ' }, //  for (MyObject object : MyObjectList)
      { name: 'newObject', before: '\ ', after: '\(' },      // ex: MyObject myObj = new MyObject()
      { name: 'objectInParenthesis', before: '\ ', after: '\)' },      //  System.assert( object instanceof objectInstance__c);
      { name: 'object', before: '"', after: '.' }, // value="MyObject__c.Field__c"
      { name: 'DeclarationObject', before: '"', after: '"' }, //  <aura:attribute name="Fields__c" type="String" />
      { name: 'GetRecordtypeinjson', before: '"', after: '@' }, //  TO PUT IN THE JSONCONFIG FILE NOT HERE
      { name: 'fieldEndline', before: ' ', after: '$' }, // Select Id FROM MyObject__c \n WHERE Field == 'tes''
      { name: 'declarationInClass', before: '', after: ' ' },
      { name: 'declarationInClassWithTab', before: '\t', after: ' ' }
    ];
    return aroundCharReplaceObjectList;
  }

  public static getAroundCharsFieldReplacementList() {
    // Default replacement list for object
    const aroundCharReplacefieldList = [
      { name: 'simpleQuote', before: '\'', after: '\'', replacementPrefix: null, replacementSuffix: null },
      { name: 'doubleQuoteJson', before: '"', after: '":' },
      { name: 'simpleQuoteFields', before: '\'', after: '.', replacementPrefix: null, replacementSuffix: null },
      { name: 'point', before: '.', after: '.' },
      { name: 'pointSpace', before: '.', after: ' ' },
      { name: 'xmlFile', before: '>', after: '</' },
      { name: 'xmlFile2', before: '.', after: '</' },
      { name: 'packageXmlFile', before: '>', after: '.' },
      { name: 'pointQuote', before: '.', after: '\'' }, // ClassName.MEthodNmae('MyObject.Myfield');
      { name: 'spacePoint', before: ' ', after: '.' }, // Database.upsert( objectList, fieldobject.Fields.fieldName__c,false) ;
      { name: 'pointEndLine', before: '.', after: ';' }, // Select id FROM MyObject__c WHERE ObjectFields__r.objectField__c
      { name: 'objectArgument', before: '(', after: '=' }, //   Object myObject = new Object(field1__c=value1, field2__c = value2);
      { name: 'fieldParenthesis', before: '(', after: ')' }, //   toLabel(field1__c)
      { name: 'endOfstring', before: ' ', after: '\'' }, //   database.query('Select id, Fields1__c, Fields__c FROM MyObject__c WHERE ObjectFields__r.objectField__c')
      { name: 'selectfields', before: ' ', after: ',' }, //   Select id, Fields1__c, Fields__c FROM MyObject__c WHERE ObjectFields__r.objectField__c
      { name: 'pointArgument', before: '.', after: ',' }, //  className.method(myObject.field1__r,myObject.field1__C);
      { name: 'pointEndParenthesis', before: '.', after: ')' },    // field in parenthesis className.method(myObject.field1__r,myObject.field1__C);
      { name: 'SOQLRequest', before: ',', after: '.' }, // lookup fields SELECT Id,Name,lookupField__r.fields
      { name: 'newObjectInitialize', before: ' ', after: '=' }, // l new myObject(field1__c=acc.Id, Field2__c='Owner')
      { name: 'firstSOQLRequest', before: 'SELECT ', after: ' ' },    // in request soql SELECT field FROM
      { name: 'firstSOQLRequestofList', before: 'SELECT ', after: ',' }, // in request soql SELECT field, field2 FROM
      { name: 'firstSOQLWhere', before: 'WHERE ', after: ' ' },    // in request soql SELECT field FROM
      { name: 'firstSOQLWhereEquals', before: 'WHERE ', after: '=' },    // in request soql SELECT field FROM
      { name: 'firstSOQLWhereHey', before: 'WHERE ', after: ' !' },    // in request soql SELECT field FROM
      { name: 'SOQLRequestofList', before: ' ', after: ',' }, // in request soql SELECT field, field2 FROM
      { name: 'lastSOQLRequestofList', before: ' ', after: ' FROM' },    // in request soql SELECT field, field2 FROM
      { name: 'lastSOQLRequestofListComma', before: ',', after: ' FROM' },    // in request soql SELECT field,field2 FROM
      { name: 'equality', before: '.', after: '=' },    // field== 'value'
      { name: 'list', before: '.', after: '}' },    // new List<String>{MyOject.Field__c});
      { name: 'inequality', before: '.', after: '!' },    // field!= 'value'
      { name: 'Concatenation', before: '.', after: '+' },    // String test = SFObject.Field1__c+';'+SFObject.Field2__c;
      { name: 'comaComa', before: ',', after: ',' }, // in select example Select field,field,field FROM Object
      { name: 'pointCalculator', before: '.', after: '*' }, // operation on field Myobject.Field__c*2
      { name: 'componentfield', before: '.', after: '"' }, // value="MyObject__c.Field__c"
      { name: 'DeclarationField', before: '"', after: '"' }, //  <aura:attribute name="Fields__c" type="String" />
      { name: 'fieldEndline', before: '.', after: '$' }, // if  MyObject__c.Field == MyObject__c.Field2 \n || etc...
      { name: 'fieldNameConcat', before: '\'', after: '=' } // if  MyObject__c.Field == MyObject__c.Field2 \n || etc...

    ];
    return aroundCharReplacefieldList;
  }

  public static getAroundCharsClassReplacementList() {
    // Default replacement list for object
    const aroundCharReplaceClassList = [
      { name: 'simpleQuote', before: '\'', after: '\'', replacementPrefix: null, replacementSuffix: null },
      { name: 'tag', before: '<', after: '>' },
      { name: 'xmlFile', before: '>', after: '</' },
      { name: 'packageXmlFile', before: '>', after: '.' },
      { name: 'stringlist', before: '\'', after: '.' }, // ClassName.MEthodNmae('MyObject.Myfield');
      { name: 'space', before: ' ', after: ' ' },
      { name: 'spacePoint', before: ' ', after: '.' }, // Database.upsert( objectList, fieldobject.Fields.fieldName__c,false) ;
      { name: 'parenthesis', before: '(', after: ')' },
      { name: 'parenthesisOpen', before: '(', after: '.' },
      { name: 'exclamation', before: '!', after: '.' },
      { name: 'parenthesisClose', before: ')', after: '.' },
      { name: 'bracketOpen', before: '{', after: '.' },
      { name: 'loop', before: '(', after: ' ' }, //  for (MyObject object : MyObjectList)
      { name: 'newObject', before: ' ', after: '(' },      // ex: MyObject myObj = new MyObject()
      { name: 'objectInParenthesis', before: '\ ', after: ')' },      //  System.assert( object instanceof objectInstance__c);
      { name: 'object', before: '"', after: '.' }, // value="MyObject__c.Field__c"
      { name: 'DeclarationObject', before: '"', after: '"' }, //  <aura:attribute name="Fields__c" type="String" />
      { name: 'GetRecordtypeinjson', before: '"', after: '@' }, //  TO PUT IN THE JSONCONFIG FILE NOT HERE
      { name: 'fieldEndline', before: ' ', after: '$' }, // Select Id FROM MyObject__c \n WHERE Field == 'tes''
      { name: 'declarationInClassWithTab', before: '\t', after: ' ' },
      { name: 'spaceAround', before: ' ', after: ' ' },
      { name: 'insideRequest', before: ':', after: '.' }
    ];
    return aroundCharReplaceClassList;
  }

  public static getLabelsReplacementList() {
    // Default replacement list for object
    const aroundCharReplaceLabelList = [
      { name: 'apexRefSpace', before: 'Label.', after: ' ' },
      { name: 'apexRefClosingBrace', before: 'Label.', after: ')' },
      { name: 'apexRefPlus', before: 'Label.', after: '+' },
      { name: 'apexSemicolon', before: 'Label.', after: ';' },
      { name: 'auraRefJsSimpleQuote', before: '$Label.c.', after: '\"' },
      { name: 'auraRefJsDoubleQuote', before: '$Label.c.', after: '\'' },
      { name: 'auraRefJsClosingBrace', before: '$Label.c.', after: '}' }
    ];
    return aroundCharReplaceLabelList;
  }

}

export { MetadataUtils };
