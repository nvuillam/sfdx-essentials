  // Describe packageXml <=> metadata folder correspondance
  export function describeMetadataTypes() {

    // folder is the corresponding folder in metadatas folder 
    // nameSuffixList are the files and/or folder names , built from the name of the package.xml item ( in <members> )

    const metadataTypesDescription = {
      // Metadatas to use for copy
      'ApexClass': { folder: 'classes', nameSuffixList: ['.cls', '.cls-meta.xml'] },
      'ApexComponent': { folder: 'components', nameSuffixList: ['.component', '.component-meta.xml'] },
      'ApexPage': { folder: 'pages', nameSuffixList: ['.page', '.page-meta.xml'] },
      'ApexTrigger': { folder: 'triggers', nameSuffixList: ['.trigger', '.trigger-meta.xml'] },
      'AuraDefinitionBundle': { folder: 'aura', nameSuffixList: [''] },
      'ContentAsset': { folder: 'contentassets', nameSuffixList: ['.asset', '.asset-meta.xml'] },
      'CustomApplication': { folder: 'applications', nameSuffixList: ['.app'] },
      'CustomLabel': { folder: 'labels', nameSuffixList: [''] },
      'CustomMetadata': { folder: 'customMetadata', nameSuffixList: ['.md'] },
      //      'CustomObjectTranslation': { folder: 'objectTranslations', nameSuffixList: ['.objectTranslation'] }, we use Translations to define the list of objectTranslations to filter & copy
      'CustomTab': { folder: 'tabs', nameSuffixList: ['.tab'] },
      'Document': { folder: 'documents', nameSuffixList: ['', '-meta.xml'] },
      'EmailTemplate': { folder: 'email', nameSuffixList: ['.email', '.email-meta.xml'] },
      'EscalationRules': { folder: 'escalationRules', nameSuffixList: ['.escalationRules'] },
      'FlexiPage': { folder: 'flexipages', nameSuffixList: ['.flexipage'] },
      'GlobalValueSet': { folder: 'globalValueSets', nameSuffixList: ['.globalValueSet'] },
      'GlobalValueSetTranslation': { folder: 'globalValueSetTranslations', nameSuffixList: ['.globalValueSetTranslation'] },
      'HomePageLayout': { folder: 'homePageLayouts', nameSuffixList: ['.homePageLayout'] },
      'Layout': { folder: 'layouts', nameSuffixList: ['.layout'] },
      'NamedCredential': { folder: 'namedCredentials', nameSuffixList: ['.namedCredential'] },
      'PermissionSet': { folder: 'permissionsets', nameSuffixList: ['.permissionset'] },
      'Profile': { folder: 'profiles', nameSuffixList: ['.profile'] },
      'QuickAction': { folder: 'quickActions', nameSuffixList: ['.quickAction'] },
      'RemoteSiteSetting': { folder: 'remoteSiteSettings', nameSuffixList: ['.remoteSite'] },
      'Report': { folder: 'reports', nameSuffixList: ['', '-meta.xml'] },
      'StandardValueSet': { folder: 'standardValueSets', nameSuffixList: ['.standardValueSet'] },
      'StaticResource': { folder: 'staticresources', nameSuffixList: ['.resource', '.resource-meta.xml'] },
      //      'Translations': { folder: 'translations', nameSuffixList: ['.translation'] }, processed apart, as they need to be filtered
      'Workflow': { folder: 'workflows', nameSuffixList: ['.workflow'] },

      // Metadatas to use for building objects folder ( SObjects )
      'BusinessProcess': { sobjectRelated: true },
      'CompactLayout': { sobjectRelated: true },
      'CustomField': { sobjectRelated: true },
      'CustomObject': { sobjectRelated: true },
      'ListView': { sobjectRelated: true },
      'RecordType': { sobjectRelated: true },
      'WebLink': { sobjectRelated: true },

      // Special case: Translations, used for object copy and for filtering 
      'Translations': { translationRelated: true , folder: 'translations', nameSuffixList: ['.translation'] },

    }
    return metadataTypesDescription
  }

  // Describe .object file <=> package.xml formats
  export function  describeObjectFilteringProperties() {

    const objectFilteringProperties = [
      { objectXmlPropName: 'businessProcesses', packageXmlPropName: 'BusinessProcess', nameProperty: 'fullName', translationNameProperty: 'name' },
      { objectXmlPropName: 'compactLayouts', packageXmlPropName: 'CompactLayout', nameProperty: 'fullName', translationNameProperty: 'layout' },
      { objectXmlPropName: 'fields', packageXmlPropName: 'CustomField', nameProperty: 'fullName', translationNameProperty: 'name' },
      { objectXmlPropName: 'listViews', packageXmlPropName: 'ListView', nameProperty: 'fullName', translationNameProperty: 'name' },
      { objectXmlPropName: 'layouts', packageXmlPropName: 'Layout', nameProperty: 'fullName', translationNameProperty: 'layout' },
      { objectXmlPropName: 'recordTypes', packageXmlPropName: 'RecordType', nameProperty: 'fullName', translationNameProperty: 'name' },
      { objectXmlPropName: 'webLinks', packageXmlPropName: 'WebLink', nameProperty: 'fullName', translationNameProperty: 'name' }
    ]
    return objectFilteringProperties
  }