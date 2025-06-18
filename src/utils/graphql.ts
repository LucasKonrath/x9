export const contributionsQuery = `
  query($username: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $username) {
      contributionsCollection(from: $from, to: $to) {
        restrictedContributionsCount
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              contributionCount
              date
            }
          }
        }
      }
    }
  }
`;

export const fetchGraphQL = async (query: string, variables: any, isPersonal: boolean = false) => {
  const endpoint = isPersonal ? '/api/github-personal' : '/api/github-corporate';
  const token = isPersonal 
    ? import.meta.env.VITE_PERSONAL_GITHUB_TOKEN 
    : import.meta.env.VITE_GITHUB_TOKEN;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables })
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.statusText}`);
  }

  return response.json();
};
