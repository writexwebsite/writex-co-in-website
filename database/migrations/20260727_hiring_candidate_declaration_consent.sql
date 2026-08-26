begin;

alter table hiring_candidate_consents
  drop constraint if exists hiring_candidate_consents_consent_type_check;

alter table hiring_candidate_consents
  add constraint hiring_candidate_consents_consent_type_check
  check (
    consent_type in (
      'application_processing',
      'assessment_monitoring',
      'candidate_declaration',
      'identity_verification',
      'education_verification',
      'background_verification',
      'talent_pool',
      'hrms_transfer',
      'public_verification'
    )
  );

commit;
