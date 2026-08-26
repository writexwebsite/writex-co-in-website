begin;

update hiring_job_roles
set public_title = 'Subject Matter Expert', updated_at = now()
where role_key = 'academic_writer'
  and public_title is distinct from 'Subject Matter Expert';

update hiring_question_bank_source_packs
set title = 'Subject Matter Expert Base Pack',
    description = 'Protected foundation questions and rubrics for the Subject Matter Expert assessment.',
    updated_at = now()
where role_key = 'academic_writer';

update hiring_assessments
set title = 'Subject Matter Expert Assessment', updated_at = now()
where role_key = 'academic_writer';

commit;
