import { createAdminClient } from './src/lib/supabase/admin';

async function findLead() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('leads')
    .select('id, project_name, summary, relevance_score')
    .ilike('project_name', '%wastewater%')
    .limit(5);

  if (error) {
    console.error('Error fetching leads:', error);
    return;
  }
  console.log('Matches:', data);
}

findLead().catch(console.error);
