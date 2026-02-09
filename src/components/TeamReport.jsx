import React, { useState, useEffect, useRef } from 'react';
import { contributionsQuery, fetchGraphQL } from '../utils/graphql';
import { fetchMarkdownPosts } from '../services/githubService';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import CorporateContributionHeatmap from './CorporateContributionHeatmap';
import GitHubContributionGraph from './GitHubContributionGraph';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Helper function to calculate commits for a Tuesday-to-Tuesday week
const getCommitsForWeek = (contributionData, weeksAgo = 0) => {
  if (!contributionData?.data?.user?.contributionsCollection?.contributionCalendar?.weeks) {
    return 0;
  }
  
  // Convert to YYYY-MM-DD format for comparison
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const today = new Date();
  let startDate, endDate;
  
  if (weeksAgo === 0) {
    // This week: from (now - 6 days) to now
    startDate = new Date(today);
    startDate.setDate(today.getDate() - 6);
    endDate = new Date(today);
  } else if (weeksAgo === 1) {
    // Last week: from (now - 13 days) to (now - 7 days)
    startDate = new Date(today);
    startDate.setDate(today.getDate() - 13);
    endDate = new Date(today);
    endDate.setDate(today.getDate() - 7);
  } else {
    // For other weeks, calculate accordingly
    const daysBack = 6 + (weeksAgo * 7);
    startDate = new Date(today);
    startDate.setDate(today.getDate() - daysBack);
    endDate = new Date(today);
    endDate.setDate(today.getDate() - (daysBack - 6));
  }
  
  const startDateStr = formatDate(startDate);
  const endDateStr = formatDate(endDate);
  
  // Flatten all contribution days and filter by date range
  const weeks = contributionData.data.user.contributionsCollection.contributionCalendar.weeks;
  let totalCommits = 0;
  
  weeks.forEach(week => {
    week.contributionDays.forEach(day => {
      if (day.date >= startDateStr && day.date <= endDateStr) {
        totalCommits += day.contributionCount;
      }
    });
  });
  
  return totalCommits;
};

// Helper function to calculate pages read per week from reading data
const getPagesReadForWeek = (readingData, weeksAgo = 0) => {
  if (!readingData) return 0;
  
  const today = new Date();
  let startDate, endDate;
  
  if (weeksAgo === 0) {
    // This week: from (now - 6 days) to now
    startDate = new Date(today);
    startDate.setDate(today.getDate() - 6);
    endDate = new Date(today);
  } else if (weeksAgo === 1) {
    // Last week: from (now - 13 days) to (now - 7 days)
    startDate = new Date(today);
    startDate.setDate(today.getDate() - 13);
    endDate = new Date(today);
    endDate.setDate(today.getDate() - 7);
  } else {
    return 0;
  }
  
  let totalPages = 0;
  
  // Check books completed in the time period
  if (readingData.booksRead && readingData.booksRead.length > 0) {
    readingData.booksRead.forEach(book => {
      if (book.completedDate && book.pageCount) {
        const completedDate = new Date(book.completedDate);
        if (completedDate >= startDate && completedDate <= endDate) {
          totalPages += book.pageCount;
        }
      }
    });
  }
  
  // For currently reading book, if it has weekly page tracking
  if (readingData.currentlyReading && readingData.currentlyReading.weeklyPages) {
    const weeklyPagesData = readingData.currentlyReading.weeklyPages;
    const weekKey = weeksAgo === 0 ? 'thisWeek' : 'lastWeek';
    if (weeklyPagesData[weekKey]) {
      totalPages += weeklyPagesData[weekKey];
    }
  }
  
  return totalPages;
};

function TeamReport({ users, corporateUsers, onClose }) {
  const [isLoading, setIsLoading] = useState(true);
  const [teamData, setTeamData] = useState([]);
  const [error, setError] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [weeklyData, setWeeklyData] = useState({});
  const [showWeeklyForm, setShowWeeklyForm] = useState(false);
  const reportRef = useRef(null);

  const generatePDF = async () => {
    if (!reportRef.current) return;
    
    try {
      setIsGeneratingPDF(true);
      
      const currentYear = new Date().getFullYear();
      const totalPersonalCommits = teamData.reduce((sum, user) => sum + user.personalYearContributions, 0);
      const totalCorporateCommits = teamData.reduce((sum, user) => sum + user.corporateYearContributions, 0);
      
      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      let isFirstPage = true;
      
      // Add header page
      pdf.setFontSize(24);
      pdf.setFont(undefined, 'bold');
      pdf.text('Team Activity Report', 105, 40, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'normal');
      pdf.text(`Generated on: ${format(new Date(), 'MMMM d, yyyy')}`, 105, 55, { align: 'center' });
      
      // Add summary stats
      pdf.setFontSize(14);
      pdf.setFont(undefined, 'bold');
      pdf.text('Summary', 20, 80);
      
      pdf.setFontSize(11);
      pdf.setFont(undefined, 'normal');
      const summaryLeftX = 20;
      const summaryRightX = 110;
      pdf.text(`Team Members: ${teamData.length}`, summaryLeftX, 95);
      pdf.text(`Total Personal Commits (${currentYear}): ${totalPersonalCommits.toLocaleString()}`, summaryLeftX, 105);
      pdf.text(`Total Corporate Commits (${currentYear}): ${totalCorporateCommits.toLocaleString()}`, summaryRightX, 95);
      pdf.text(`Combined Total: ${(totalPersonalCommits + totalCorporateCommits).toLocaleString()}`, summaryRightX, 105);
      
      // Get all team member cards
      const teamCards = reportRef.current.querySelectorAll('.bg-\\[\\#0f172a\\].border.border-\\[\\#334155\\].rounded-lg.p-4');
      
      console.log(`Found ${teamCards.length} team member cards to process`);
      
      // Process each team member card
      for (let i = 0; i < teamCards.length; i++) {
        const card = teamCards[i];
        
        console.log(`Processing team member ${i + 1}/${teamCards.length}`);
        
        // Add new page for each team member
        pdf.addPage();
        
        // Temporarily make card visible and remove constraints
        const originalStyles = {
          maxHeight: card.style.maxHeight,
          overflow: card.style.overflow,
          height: card.style.height
        };
        
        card.style.maxHeight = 'none';
        card.style.overflow = 'visible';
        card.style.height = 'auto';
        
        // Wait for layout
        await new Promise(resolve => setTimeout(resolve, 100));
        
        try {
          // Capture this team member's card with reduced scale for smaller file size
          const canvas = await html2canvas(card, {
            scale: 0.5,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#0f172a',
            logging: false,
            width: card.scrollWidth,
            height: card.scrollHeight
          });
          
          // Restore original styles
          card.style.maxHeight = originalStyles.maxHeight;
          card.style.overflow = originalStyles.overflow;
          card.style.height = originalStyles.height;
          
          // Use JPEG with compression for much smaller file size
          const imgData = canvas.toDataURL('image/jpeg', 0.5);
          
          // Calculate dimensions to fit A4 page with margins
          const pageWidth = 210; // A4 width in mm
          const pageHeight = 297; // A4 height in mm
          const margin = 10;
          const maxWidth = pageWidth - (2 * margin);
          const maxHeight = pageHeight - (2 * margin);
          
          let imgWidth = maxWidth;
          let imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          // If image is too tall, scale it down
          if (imgHeight > maxHeight) {
            imgHeight = maxHeight;
            imgWidth = (canvas.width * imgHeight) / canvas.height;
          }
          
          // Center the image on the page
          const xPos = (pageWidth - imgWidth) / 2;
          const yPos = margin;
          
          // Add as JPEG for smaller file size
          pdf.addImage(imgData, 'JPEG', xPos, yPos, imgWidth, imgHeight, undefined, 'FAST');
          
          console.log(`Successfully added team member ${i + 1} to PDF`);
          
        } catch (err) {
          console.error(`Failed to capture team member ${i + 1}:`, err);
          
          // Restore styles even on error
          card.style.maxHeight = originalStyles.maxHeight;
          card.style.overflow = originalStyles.overflow;
          card.style.height = originalStyles.height;
        }
      }
      
      // Save the PDF
      const fileName = `team-activity-report-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
      pdf.save(fileName);
      
      console.log('PDF generated successfully with all team members');
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Initialize weekly data for all users
  useEffect(() => {
    const initialWeeklyData = {};
    users.forEach(username => {
      initialWeeklyData[username] = {
        personalCommitsThisWeek: '',
        personalCommitsLastWeek: '',
        corporateCommitsThisWeek: '',
        corporateCommitsLastWeek: '',
        pagesThisWeek: '',
        pagesLastWeek: '',
        managerFeedbackDate: '',
        pocsThisWeek: '',
        pocsLastWeek: '',
        projectPRsThisWeek: '',
        projectPRsLastWeek: '',
        slackContributionsThisWeek: '',
        slackContributionsLastWeek: '',
        keyFindings: ['', '', '']
      };
    });
    setWeeklyData(initialWeeklyData);
  }, [users]);

  // Update weekly data for a specific user
  const updateWeeklyData = (username, field, value, index = null) => {
    setWeeklyData(prev => {
      const updated = { ...prev };
      if (field === 'keyFindings' && index !== null) {
        updated[username].keyFindings[index] = value;
      } else {
        updated[username][field] = value;
      }
      return updated;
    });
  };

  const generateMarkdown = async () => {
    try {
      const currentDate = format(new Date(), 'MMMM d, yyyy');
      const currentYear = new Date().getFullYear();
      
      // Calculate summary stats
      const totalPersonalCommits = teamData.reduce((sum, user) => sum + user.personalYearContributions, 0);
      const totalCorporateCommits = teamData.reduce((sum, user) => sum + user.corporateYearContributions, 0);
      
      let markdown = `# Team Activity Report

**Generated on:** ${currentDate}

## Summary

- **Team Members:** ${teamData.length}
- **Total Personal Commits (${currentYear}):** ${totalPersonalCommits.toLocaleString()}
- **Total Corporate Commits (${currentYear}):** ${totalCorporateCommits.toLocaleString()}
- **Combined Total:** ${(totalPersonalCommits + totalCorporateCommits).toLocaleString()}

---

## Individual Team Member Reports

`;

      // Create a JSZip instance to bundle images with markdown
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      // Add each team member's data
      for (const userData of teamData) {
        markdown += `### ${userData.username}

**GitHub Activity (${currentYear}):**
- Personal Commits: ${userData.personalYearContributions.toLocaleString()}
- Corporate Commits: ${userData.corporateYearContributions.toLocaleString()}
- **Total:** ${(userData.personalYearContributions + userData.corporateYearContributions).toLocaleString()}

`;

        // Add weekly information if available
        const userWeeklyData = weeklyData[userData.username];
        if (userWeeklyData && Object.values(userWeeklyData).some(val => Array.isArray(val) ? val.some(v => v) : val)) {
          markdown += `**Weekly Summary:**\n`;
          if (userWeeklyData.personalCommitsThisWeek || userWeeklyData.personalCommitsLastWeek) {
            markdown += `- Personal Commits: ${userWeeklyData.personalCommitsThisWeek || '0'}/${userWeeklyData.personalCommitsLastWeek || '0'}\n`;
          }
          if (userWeeklyData.corporateCommitsThisWeek || userWeeklyData.corporateCommitsLastWeek) {
            markdown += `- Corporate Commits: ${userWeeklyData.corporateCommitsThisWeek || '0'}/${userWeeklyData.corporateCommitsLastWeek || '0'}\n`;
          }
          if (userWeeklyData.pagesThisWeek || userWeeklyData.pagesLastWeek) {
            markdown += `- Pages: ${userWeeklyData.pagesThisWeek || '0'}/${userWeeklyData.pagesLastWeek || '0'}\n`;
          }
          if (userWeeklyData.managerFeedbackDate) {
            markdown += `- Manager Feedback Date: ${userWeeklyData.managerFeedbackDate}\n`;
          }
          if (userWeeklyData.pocsThisWeek || userWeeklyData.pocsLastWeek) {
            markdown += `- Program POCs: ${userWeeklyData.pocsThisWeek || '0'}/${userWeeklyData.pocsLastWeek || '0'}\n`;
          }
          if (userWeeklyData.projectPRsThisWeek || userWeeklyData.projectPRsLastWeek) {
            markdown += `- Project PRs: ${userWeeklyData.projectPRsThisWeek || '0'}/${userWeeklyData.projectPRsLastWeek || '0'}\n`;
          }
          if (userWeeklyData.slackContributionsThisWeek || userWeeklyData.slackContributionsLastWeek) {
            markdown += `- Slack Contributions: ${userWeeklyData.slackContributionsThisWeek || '0'}/${userWeeklyData.slackContributionsLastWeek || '0'}\n`;
          }
          const filledKeyFindings = userWeeklyData.keyFindings.filter(kf => kf);
          if (filledKeyFindings.length > 0) {
            markdown += `\n**Key Findings:**\n`;
            filledKeyFindings.forEach(finding => {
              markdown += `- ${finding}\n`;
            });
          }
          markdown += `\n`;
        }

        // Capture personal contribution graph
        try {
          const personalGraphElement = document.querySelector(`[data-username="${userData.username}"][data-type="personal"]`);
          if (personalGraphElement) {
            const personalCanvas = await html2canvas(personalGraphElement, {
              backgroundColor: '#0f172a',
              scale: 2,
              logging: false
            });
            const personalImageData = personalCanvas.toDataURL('image/png');
            const personalImageName = `${userData.username}-personal-contributions.png`;
            
            // Convert base64 to blob and add to zip
            const personalImageBlob = await fetch(personalImageData).then(res => res.blob());
            zip.file(personalImageName, personalImageBlob);
            
            markdown += `**Personal Contributions:**
![${userData.username} Personal Contributions](${personalImageName})

`;
          }
        } catch (err) {
          console.warn(`Failed to capture personal contribution graph for ${userData.username}:`, err);
          markdown += `**Personal Contributions:** _(Screenshot unavailable)_

`;
        }

        // Capture corporate contribution graph
        try {
          const corporateGraphElement = document.querySelector(`[data-username="${userData.corporateUser}"][data-type="corporate"]`);
          if (corporateGraphElement) {
            const corporateCanvas = await html2canvas(corporateGraphElement, {
              backgroundColor: '#0f172a',
              scale: 2,
              logging: false
            });
            const corporateImageData = corporateCanvas.toDataURL('image/png');
            const corporateImageName = `${userData.username}-corporate-contributions.png`;
            
            // Convert base64 to blob and add to zip
            const corporateImageBlob = await fetch(corporateImageData).then(res => res.blob());
            zip.file(corporateImageName, corporateImageBlob);
            
            markdown += `**Corporate Contributions:**
![${userData.username} Corporate Contributions](${corporateImageName})

`;
          }
        } catch (err) {
          console.warn(`Failed to capture corporate contribution graph for ${userData.username}:`, err);
          markdown += `**Corporate Contributions:** _(Screenshot unavailable)_

`;
        }

        // Add latest meeting notes if available
        if (userData.latestNote) {
          markdown += `**Latest Meeting Notes** (${userData.latestNote.date}):

${userData.latestNote.content}

`;
        }

        // Add reinforcements if available
        if (userData.reinforcements && userData.reinforcements.reinforcements && userData.reinforcements.reinforcements.length > 0) {
          markdown += `**Current Reinforcements** (Updated: ${userData.reinforcements.lastUpdated}):

`;
          userData.reinforcements.reinforcements.forEach((reinforcement, idx) => {
            markdown += `${idx + 1}. **${reinforcement.category}** (${reinforcement.priority} priority, ${reinforcement.status.replace('_', ' ')})
   - ${reinforcement.description}
`;
            if (reinforcement.notes) {
              markdown += `   - Notes: ${reinforcement.notes}
`;
            }
          });
          markdown += `
`;
        }

        // Add reading progress if available
        if (userData.readingData) {
          markdown += `**Reading Progress:**
- Goal: ${userData.readingData.readingGoals.completed}/${userData.readingData.readingGoals.yearly} books (${Math.round((userData.readingData.readingGoals.completed / userData.readingData.readingGoals.yearly) * 100)}% complete)
`;
          
          if (userData.readingData.currentlyReading) {
            markdown += `- Currently Reading: "${userData.readingData.currentlyReading.title}" by ${userData.readingData.currentlyReading.author} (${userData.readingData.currentlyReading.progress}% complete)
`;
          }
          
          if (userData.readingData.booksRead && userData.readingData.booksRead.length > 0) {
            markdown += `- Recent Books Completed:
`;
            userData.readingData.booksRead.slice(0, 3).forEach((book) => {
              markdown += `  - "${book.title}" by ${book.author} (${book.rating}/5 ⭐, completed ${book.completedDate})
`;
            });
          }
          markdown += `
`;
        }

        markdown += `---

`;
      }

      // Add footer
      markdown += `## Report Details

This report was automatically generated from the X9 Team Dashboard on ${currentDate}.

**Data Sources:**
- GitHub personal and corporate contribution data
- Meeting notes and documentation
- Performance reinforcements and feedback
- Reading progress and goals

For more detailed analytics and visualizations, access the full dashboard.`;

      // Add markdown file to zip
      zip.file(`team-activity-report-${format(new Date(), 'yyyy-MM-dd-HHmm')}.md`, markdown);
      
      // Generate and download the zip file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `team-activity-report-${format(new Date(), 'yyyy-MM-dd-HHmm')}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error generating Markdown:', error);
      alert('Failed to generate Markdown report. Please try again.');
    }
  };

  useEffect(() => {
    const fetchTeamData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const userDataResults = await Promise.allSettled(users.map(async (username, index) => {
          try {
            // Get corresponding corporate username
            const corporateUser = corporateUsers[index];
            
            // Fetch personal contributions
            const now = new Date();
            const fromDate = new Date(now);
            fromDate.setFullYear(fromDate.getFullYear() - 1);

            let personalData;
            try {
              personalData = await fetchGraphQL(contributionsQuery, {
                username,
                from: fromDate.toISOString(),
                to: now.toISOString()
              }, true);
            } catch (err) {
              console.warn(`Failed to fetch personal contributions for ${username}:`, err);
              // Provide fallback data structure
              personalData = {
                data: {
                  user: {
                    contributionsCollection: {
                      contributionCalendar: {
                        weeks: []
                      }
                    }
                  }
                }
              };
            }

            // Fetch corporate contributions
            let corporateData;
            try {
              const currentYear = new Date().getFullYear();
              corporateData = await fetchGraphQL(contributionsQuery, {
                username: corporateUser,
                from: `${currentYear}-01-01T00:00:00Z`,
                to: now.toISOString()
              }, false);
            } catch (err) {
              console.warn(`Failed to fetch corporate contributions for ${corporateUser}:`, err);
              // Provide fallback data structure
              corporateData = {
                data: {
                  user: {
                    contributionsCollection: {
                      contributionCalendar: {
                        weeks: []
                      }
                    }
                  }
                }
              };
            }

            // Fetch latest meeting notes
            let latestNote = null;
            try {
              const markdownPosts = await fetchMarkdownPosts(username);
              latestNote = markdownPosts.length > 0 ? markdownPosts[0] : null;
            } catch (err) {
              console.warn(`Failed to fetch meeting notes for ${username}:`, err);
            }

            // Fetch reinforcement data
            let reinforcements = null;
            try {
              const reinforcementResponse = await fetch(`http://localhost:3001/api/users/${username}/reinforcements`);
              if (reinforcementResponse.ok) {
                reinforcements = await reinforcementResponse.json();
              }
            } catch (err) {
              console.warn(`Failed to fetch reinforcements for ${username}:`, err);
            }

            // Fetch reading data
            let readingData = null;
            try {
              const readingResponse = await fetch(`http://localhost:3001/api/users/${username}/reading`);
              if (readingResponse.ok) {
                readingData = await readingResponse.json();
              }
            } catch (err) {
              console.warn(`Failed to fetch reading data for ${username}:`, err);
            }

            // Fetch presentation data
            let presentationData = null;
            try {
              const presentationResponse = await fetch(`http://localhost:3001/api/users/${username}/presentations`);
              if (presentationResponse.ok) {
                presentationData = await presentationResponse.json();
              }
            } catch (err) {
              console.warn(`Failed to fetch presentation data for ${username}:`, err);
            }

            // Calculate current year contributions with safe fallbacks
            const currentYear = new Date().getFullYear().toString();
            const personalYearContributions = personalData?.data?.user?.contributionsCollection?.contributionCalendar?.weeks
              ? personalData.data.user.contributionsCollection.contributionCalendar.weeks
                  .reduce((sum, week) => sum + week.contributionDays
                    .reduce((daySum, day) => daySum + (day.date.startsWith(currentYear) ? day.contributionCount : 0), 0), 0)
              : 0;

            const corporateYearContributions = corporateData?.data?.user?.contributionsCollection?.contributionCalendar?.weeks
              ? corporateData.data.user.contributionsCollection.contributionCalendar.weeks
                  .reduce((sum, week) => sum + week.contributionDays
                    .reduce((daySum, day) => daySum + (day.date.startsWith(currentYear) ? day.contributionCount : 0), 0), 0)
              : 0;

            return {
              username,
              corporateUser,
              personalYearContributions,
              corporateYearContributions,
              latestNote,
              reinforcements,
              readingData,
              presentationData,
              personalData,
              corporateData
            };
          } catch (err) {
            console.error(`Failed to fetch data for user ${username}:`, err);
            // Return a minimal user object so the report can still be generated
            return {
              username,
              corporateUser: corporateUsers[index] || 'unknown',
              personalYearContributions: 0,
              corporateYearContributions: 0,
              latestNote: null,
              reinforcements: null,
              readingData: null,
              presentationData: null,
              error: err.message,
              personalData: null,
              corporateData: null
            };
          }
        }));

        // Filter out rejected promises and extract successful data
        const userData = userDataResults
          .filter(result => result.status === 'fulfilled')
          .map(result => result.value);

        setTeamData(userData);
        
        // Calculate weekly data from contribution data
        const calculatedWeeklyData = {};
        userData.forEach(user => {
          const pagesThisWeek = getPagesReadForWeek(user.readingData, 0);
          const pagesLastWeek = getPagesReadForWeek(user.readingData, 1);
          
          calculatedWeeklyData[user.username] = {
            personalCommitsThisWeek: getCommitsForWeek(user.personalData, 0).toString(),
            personalCommitsLastWeek: getCommitsForWeek(user.personalData, 1).toString(),
            corporateCommitsThisWeek: getCommitsForWeek(user.corporateData, 0).toString(),
            corporateCommitsLastWeek: getCommitsForWeek(user.corporateData, 1).toString(),
            pagesThisWeek: pagesThisWeek > 0 ? pagesThisWeek.toString() : '',
            pagesLastWeek: pagesLastWeek > 0 ? pagesLastWeek.toString() : '',
            managerFeedbackDate: '',
            pocsThisWeek: '',
            pocsLastWeek: '',
            projectPRsThisWeek: '',
            projectPRsLastWeek: '',
            slackContributionsThisWeek: '',
            slackContributionsLastWeek: '',
            keyFindings: ['', '', '']
          };
        });
        setWeeklyData(calculatedWeeklyData);
      } catch (err) {
        console.error('Error fetching team data:', err);
        setError('Failed to load team data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeamData();
  }, [users, corporateUsers]);

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-6 w-full max-w-4xl mx-4">
          <div className="text-red-400 text-center">
            <p>{error}</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-[#334155] text-white rounded hover:bg-[#475569]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-6 w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Team Activity Report</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowWeeklyForm(!showWeeklyForm)}
              disabled={isLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                showWeeklyForm 
                  ? 'bg-[#4ade80] text-black hover:bg-[#86efac]' 
                  : 'bg-[#334155] text-white hover:bg-[#475569]'
              }`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {showWeeklyForm ? 'Hide' : 'Weekly Info'}
            </button>
            <button
              onClick={generateMarkdown}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] text-white rounded hover:bg-[#60a5fa] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Markdown
            </button>
            <button
              onClick={generatePDF}
              disabled={isGeneratingPDF || isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-[#4ade80] text-black rounded hover:bg-[#86efac] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGeneratingPDF ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating PDF...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download PDF
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Weekly Information Form */}
        {showWeeklyForm && !isLoading && (
          <div className="mb-6 bg-[#0f172a] border border-[#334155] rounded-lg p-4">
            <h3 className="text-xl font-semibold text-white mb-4">Weekly Summary (This Week / Last Week)</h3>
            <div className="space-y-6">
              {users.map(username => (
                <div key={username} className="bg-[#1e293b] border border-[#334155] rounded-lg p-4">
                  <h4 className="text-lg font-medium text-white mb-3">{username}</h4>
                  
                  {/* Commits Section */}
                  <div className="mb-4">
                    <h5 className="text-md font-medium text-gray-300 mb-2">Commits</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">
                          Personal (This Week / Last Week)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={weeklyData[username]?.personalCommitsThisWeek || ''}
                            onChange={(e) => updateWeeklyData(username, 'personalCommitsThisWeek', e.target.value)}
                            className="w-full px-3 py-2 bg-[#0f172a] border border-[#334155] rounded text-white focus:outline-none focus:border-[#4ade80]"
                            placeholder="This week"
                          />
                          <span className="text-white self-center">/</span>
                          <input
                            type="number"
                            value={weeklyData[username]?.personalCommitsLastWeek || ''}
                            onChange={(e) => updateWeeklyData(username, 'personalCommitsLastWeek', e.target.value)}
                            className="w-full px-3 py-2 bg-[#0f172a] border border-[#334155] rounded text-white focus:outline-none focus:border-[#4ade80]"
                            placeholder="Last week"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">
                          Corporate (This Week / Last Week)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={weeklyData[username]?.corporateCommitsThisWeek || ''}
                            onChange={(e) => updateWeeklyData(username, 'corporateCommitsThisWeek', e.target.value)}
                            className="w-full px-3 py-2 bg-[#0f172a] border border-[#334155] rounded text-white focus:outline-none focus:border-[#4ade80]"
                            placeholder="This week"
                          />
                          <span className="text-white self-center">/</span>
                          <input
                            type="number"
                            value={weeklyData[username]?.corporateCommitsLastWeek || ''}
                            onChange={(e) => updateWeeklyData(username, 'corporateCommitsLastWeek', e.target.value)}
                            className="w-full px-3 py-2 bg-[#0f172a] border border-[#334155] rounded text-white focus:outline-none focus:border-[#4ade80]"
                            placeholder="Last week"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pages Section */}
                  <div className="mb-4">
                    <h5 className="text-md font-medium text-gray-300 mb-2">Pages</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">
                          This Week / Last Week
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={weeklyData[username]?.pagesThisWeek || ''}
                            onChange={(e) => updateWeeklyData(username, 'pagesThisWeek', e.target.value)}
                            className="w-full px-3 py-2 bg-[#0f172a] border border-[#334155] rounded text-white focus:outline-none focus:border-[#4ade80]"
                            placeholder="This week"
                          />
                          <span className="text-white self-center">/</span>
                          <input
                            type="number"
                            value={weeklyData[username]?.pagesLastWeek || ''}
                            onChange={(e) => updateWeeklyData(username, 'pagesLastWeek', e.target.value)}
                            className="w-full px-3 py-2 bg-[#0f172a] border border-[#334155] rounded text-white focus:outline-none focus:border-[#4ade80]"
                            placeholder="Last week"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">
                          Manager Feedback Date
                        </label>
                        <input
                          type="text"
                          value={weeklyData[username]?.managerFeedbackDate || ''}
                          onChange={(e) => updateWeeklyData(username, 'managerFeedbackDate', e.target.value)}
                          className="w-full px-3 py-2 bg-[#0f172a] border border-[#334155] rounded text-white focus:outline-none focus:border-[#4ade80]"
                          placeholder="e.g., Jan 15, 2026"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Program POCs Section */}
                  <div className="mb-4">
                    <h5 className="text-md font-medium text-gray-300 mb-2">Program POCs</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">
                          This Week / Last Week
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={weeklyData[username]?.pocsThisWeek || ''}
                            onChange={(e) => updateWeeklyData(username, 'pocsThisWeek', e.target.value)}
                            className="w-full px-3 py-2 bg-[#0f172a] border border-[#334155] rounded text-white focus:outline-none focus:border-[#4ade80]"
                            placeholder="This week"
                          />
                          <span className="text-white self-center">/</span>
                          <input
                            type="number"
                            value={weeklyData[username]?.pocsLastWeek || ''}
                            onChange={(e) => updateWeeklyData(username, 'pocsLastWeek', e.target.value)}
                            className="w-full px-3 py-2 bg-[#0f172a] border border-[#334155] rounded text-white focus:outline-none focus:border-[#4ade80]"
                            placeholder="Last week"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Project PRs Section */}
                  <div className="mb-4">
                    <h5 className="text-md font-medium text-gray-300 mb-2">Project PRs</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">
                          This Week / Last Week
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={weeklyData[username]?.projectPRsThisWeek || ''}
                            onChange={(e) => updateWeeklyData(username, 'projectPRsThisWeek', e.target.value)}
                            className="w-full px-3 py-2 bg-[#0f172a] border border-[#334155] rounded text-white focus:outline-none focus:border-[#4ade80]"
                            placeholder="This week"
                          />
                          <span className="text-white self-center">/</span>
                          <input
                            type="number"
                            value={weeklyData[username]?.projectPRsLastWeek || ''}
                            onChange={(e) => updateWeeklyData(username, 'projectPRsLastWeek', e.target.value)}
                            className="w-full px-3 py-2 bg-[#0f172a] border border-[#334155] rounded text-white focus:outline-none focus:border-[#4ade80]"
                            placeholder="Last week"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Slack Contributions Section */}
                  <div className="mb-4">
                    <h5 className="text-md font-medium text-gray-300 mb-2">Slack Contributions</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">
                          This Week / Last Week
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={weeklyData[username]?.slackContributionsThisWeek || ''}
                            onChange={(e) => updateWeeklyData(username, 'slackContributionsThisWeek', e.target.value)}
                            className="w-full px-3 py-2 bg-[#0f172a] border border-[#334155] rounded text-white focus:outline-none focus:border-[#4ade80]"
                            placeholder="This week"
                          />
                          <span className="text-white self-center">/</span>
                          <input
                            type="number"
                            value={weeklyData[username]?.slackContributionsLastWeek || ''}
                            onChange={(e) => updateWeeklyData(username, 'slackContributionsLastWeek', e.target.value)}
                            className="w-full px-3 py-2 bg-[#0f172a] border border-[#334155] rounded text-white focus:outline-none focus:border-[#4ade80]"
                            placeholder="Last week"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Key Findings Section */}
                  <div className="mb-4">
                    <h5 className="text-md font-medium text-gray-300 mb-2">Key Findings</h5>
                    <div className="space-y-2">
                      {[0, 1, 2].map(index => (
                        <input
                          key={index}
                          type="text"
                          value={weeklyData[username]?.keyFindings[index] || ''}
                          onChange={(e) => updateWeeklyData(username, 'keyFindings', e.target.value, index)}
                          className="w-full px-3 py-2 bg-[#0f172a] border border-[#334155] rounded text-white focus:outline-none focus:border-[#4ade80]"
                          placeholder={`Key finding ${index + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-pulse flex space-x-2">
              <div className="h-4 w-4 bg-[#4ade80] rounded-full"></div>
              <div className="h-4 w-4 bg-[#4ade80] rounded-full animation-delay-200"></div>
              <div className="h-4 w-4 bg-[#4ade80] rounded-full animation-delay-400"></div>
            </div>
          </div>
        ) : (
          <div ref={reportRef} className="space-y-8"
            style={{ 
              // Ensure proper styling for PDF generation
              backgroundColor: '#0f172a',
              padding: '16px',
              borderRadius: '8px'
            }}
          >
            {/* Warning message if some users had data loading issues */}
            {teamData.some(user => user.error) && (
              <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <h4 className="text-yellow-400 font-medium">Data Loading Issues</h4>
                </div>
                <p className="text-yellow-200 text-sm mt-2">
                  Some team members have incomplete data due to API errors. The report shows available data only.
                  Users with issues: {teamData.filter(user => user.error).map(user => user.username).join(', ')}
                </p>
              </div>
            )}

            {teamData.map((userData) => (
              <div
                key={userData.username}
                className="bg-[#0f172a] border border-[#334155] rounded-lg p-4"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white">
                      {userData.username}
                    </h3>
                    {userData.error && (
                      <div className="flex items-center gap-2 mt-1">
                        <svg className="h-4 w-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <span className="text-sm text-yellow-400">Some data failed to load</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Personal Commits ({new Date().getFullYear()})</p>
                      <p className="text-lg font-medium text-[#4ade80]">
                        {userData.personalYearContributions}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Corporate Commits ({new Date().getFullYear()})</p>
                      <p className="text-lg font-medium text-[#4ade80]">
                        {userData.corporateYearContributions}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Weekly Information Section */}
                {weeklyData[userData.username] && Object.values(weeklyData[userData.username]).some(val => Array.isArray(val) ? val.some(v => v) : val) && (
                  <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-4 mb-4">
                    <h4 className="text-lg font-medium text-white mb-3">📊 Weekly Summary</h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      {/* Commits */}
                      {(weeklyData[userData.username].personalCommitsThisWeek || weeklyData[userData.username].personalCommitsLastWeek) && (
                        <div className="bg-[#0f172a] rounded-lg p-3">
                          <p className="text-sm text-gray-400 mb-1">Personal Commits</p>
                          <p className="text-2xl font-semibold text-[#4ade80]">
                            {weeklyData[userData.username].personalCommitsThisWeek || '0'}/{weeklyData[userData.username].personalCommitsLastWeek || '0'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">This Week / Last Week</p>
                        </div>
                      )}
                      {(weeklyData[userData.username].corporateCommitsThisWeek || weeklyData[userData.username].corporateCommitsLastWeek) && (
                        <div className="bg-[#0f172a] rounded-lg p-3">
                          <p className="text-sm text-gray-400 mb-1">Corporate Commits</p>
                          <p className="text-2xl font-semibold text-[#4ade80]">
                            {weeklyData[userData.username].corporateCommitsThisWeek || '0'}/{weeklyData[userData.username].corporateCommitsLastWeek || '0'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">This Week / Last Week</p>
                        </div>
                      )}
                      {/* Pages */}
                      {(weeklyData[userData.username].pagesThisWeek || weeklyData[userData.username].pagesLastWeek) && (
                        <div className="bg-[#0f172a] rounded-lg p-3">
                          <p className="text-sm text-gray-400 mb-1">Pages</p>
                          <p className="text-2xl font-semibold text-[#4ade80]">
                            {weeklyData[userData.username].pagesThisWeek || '0'}/{weeklyData[userData.username].pagesLastWeek || '0'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">This Week / Last Week</p>
                        </div>
                      )}
                      {/* Manager Feedback Date */}
                      {weeklyData[userData.username].managerFeedbackDate && (
                        <div className="bg-[#0f172a] rounded-lg p-3">
                          <p className="text-sm text-gray-400 mb-1">Manager Feedback Date</p>
                          <p className="text-lg font-semibold text-white">
                            {weeklyData[userData.username].managerFeedbackDate}
                          </p>
                        </div>
                      )}
                      {/* Program POCs */}
                      {(weeklyData[userData.username].pocsThisWeek || weeklyData[userData.username].pocsLastWeek) && (
                        <div className="bg-[#0f172a] rounded-lg p-3">
                          <p className="text-sm text-gray-400 mb-1">Program POCs</p>
                          <p className="text-2xl font-semibold text-[#4ade80]">
                            {weeklyData[userData.username].pocsThisWeek || '0'}/{weeklyData[userData.username].pocsLastWeek || '0'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">This Week / Last Week</p>
                        </div>
                      )}
                      {/* Project PRs */}
                      {(weeklyData[userData.username].projectPRsThisWeek || weeklyData[userData.username].projectPRsLastWeek) && (
                        <div className="bg-[#0f172a] rounded-lg p-3">
                          <p className="text-sm text-gray-400 mb-1">Project PRs</p>
                          <p className="text-2xl font-semibold text-[#4ade80]">
                            {weeklyData[userData.username].projectPRsThisWeek || '0'}/{weeklyData[userData.username].projectPRsLastWeek || '0'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">This Week / Last Week</p>
                        </div>
                      )}
                      {/* Slack Contributions */}
                      {(weeklyData[userData.username].slackContributionsThisWeek || weeklyData[userData.username].slackContributionsLastWeek) && (
                        <div className="bg-[#0f172a] rounded-lg p-3">
                          <p className="text-sm text-gray-400 mb-1">Slack Contributions</p>
                          <p className="text-2xl font-semibold text-[#4ade80]">
                            {weeklyData[userData.username].slackContributionsThisWeek || '0'}/{weeklyData[userData.username].slackContributionsLastWeek || '0'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">This Week / Last Week</p>
                        </div>
                      )}
                    </div>
                    {/* Key Findings */}
                    {weeklyData[userData.username].keyFindings.some(kf => kf) && (
                      <div className="mt-4 pt-4 border-t border-[#334155]">
                        <p className="text-sm text-gray-400 mb-3 font-medium">Key Findings</p>
                        <ul className="space-y-2">
                          {weeklyData[userData.username].keyFindings
                            .filter(kf => kf)
                            .map((finding, idx) => (
                              <li key={idx} className="text-white flex items-start gap-2">
                                <span className="text-[#4ade80] mt-1 text-lg">•</span>
                                <span className="flex-1">{finding}</span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-4 mb-4">
                  <div className="w-full">
                    <p className="text-sm text-gray-400 mb-2">Personal Contributions</p>
                    <div data-username={userData.username} data-type="personal">
                      <GitHubContributionGraph 
                        username={userData.username} 
                        minimal={false} 
                      />
                    </div>
                  </div>
                  <div className="w-full">
                    <p className="text-sm text-gray-400 mb-2">Corporate Contributions</p>
                    <div data-username={userData.corporateUser} data-type="corporate">
                      <CorporateContributionHeatmap 
                        corporateUser={userData.corporateUser}
                        minimal={false} 
                      />
                    </div>
                  </div>
                </div>

                {userData.latestNote && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-400 mb-2 flex justify-between items-center">
                      <span>Latest Meeting Notes</span>
                      <span className="text-[#4ade80]">
                        {userData.latestNote.date}
                      </span>
                    </h4>
                    <div className="bg-[#1e293b] rounded p-4">
                      <div className="prose prose-invert max-w-none">
                        <ReactMarkdown>{userData.latestNote.content}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}

                {userData.reinforcements && userData.reinforcements.reinforcements && userData.reinforcements.reinforcements.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-400 mb-2 flex justify-between items-center">
                      <span>Current Reinforcements</span>
                      <span className="text-[#4ade80] text-xs">
                        Updated: {userData.reinforcements.lastUpdated}
                      </span>
                    </h4>
                    <div className="bg-[#1e293b] rounded p-4">
                      <div className="grid gap-3">
                        {userData.reinforcements.reinforcements.map((reinforcement) => (
                          <div key={reinforcement.id} className="border-l-4 pl-3 py-2" style={{
                            borderLeftColor: 
                              reinforcement.priority === 'high' ? '#ef4444' :
                              reinforcement.priority === 'medium' ? '#f59e0b' : '#6b7280'
                          }}>
                            <div className="flex items-start justify-between mb-1">
                              <span className="text-sm font-medium text-white">
                                {reinforcement.category}
                              </span>
                              <div className="flex gap-2">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  reinforcement.priority === 'high' ? 'bg-red-900 text-red-300' :
                                  reinforcement.priority === 'medium' ? 'bg-yellow-900 text-yellow-300' :
                                  'bg-gray-900 text-gray-300'
                                }`}>
                                  {reinforcement.priority}
                                </span>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  reinforcement.status === 'strength' ? 'bg-green-900 text-green-300' :
                                  reinforcement.status === 'needs_improvement' ? 'bg-red-900 text-red-300' :
                                  reinforcement.status === 'ongoing' ? 'bg-blue-900 text-blue-300' :
                                  'bg-gray-900 text-gray-300'
                                }`}>
                                  {reinforcement.status.replace('_', ' ')}
                                </span>
                              </div>
                            </div>
                            <p className="text-sm text-gray-300 mb-1">
                              {reinforcement.description}
                            </p>
                            {reinforcement.notes && (
                              <p className="text-xs text-gray-400">
                                {reinforcement.notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {userData.readingData && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-400 mb-2 flex justify-between items-center">
                      <span>Reading Progress</span>
                      <span className="text-[#4ade80] text-xs">
                        {userData.readingData.readingGoals.completed}/{userData.readingData.readingGoals.yearly} books ({new Date().getFullYear()})
                      </span>
                    </h4>
                    <div className="bg-[#1e293b] rounded p-4">
                      {userData.readingData.currentlyReading && (
                        <div className="mb-3 pb-3 border-b border-gray-600">
                          <h5 className="text-sm font-medium text-white mb-1">Currently Reading</h5>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="text-sm text-gray-300">
                                "{userData.readingData.currentlyReading.title}" by {userData.readingData.currentlyReading.author}
                              </p>
                              {userData.readingData.currentlyReading.notes && (
                                <p className="text-xs text-gray-400 mt-1">
                                  {userData.readingData.currentlyReading.notes.substring(0, 100)}
                                  {userData.readingData.currentlyReading.notes.length > 100 ? '...' : ''}
                                </p>
                              )}
                            </div>
                            <div className="ml-3 text-right">
                              <div className="text-sm font-medium text-[#4ade80]">{userData.readingData.currentlyReading.progress}%</div>
                              <div className="w-16 bg-gray-700 rounded-full h-2 mt-1">
                                <div 
                                  className="bg-[#4ade80] h-2 rounded-full"
                                  style={{ width: `${userData.readingData.currentlyReading.progress}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {userData.readingData.booksRead && userData.readingData.booksRead.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-white mb-2">Recent Books</h5>
                          <div className="space-y-2">
                            {userData.readingData.booksRead.slice(0, 3).map((book) => (
                              <div key={book.id} className="flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="text-sm text-gray-300">
                                    "{book.title}" by {book.author}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                                      {book.category}
                                    </span>
                                    <div className="flex items-center">
                                      {'★'.repeat(book.rating)}
                                      <span className="text-xs text-gray-500 ml-1">({book.rating}/5)</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500 ml-2">
                                  {book.completedDate}
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          <div className="mt-3 pt-3 border-t border-gray-600">
                            <div className="flex items-center justify-between text-xs text-gray-400">
                              <span>Reading Goal Progress:</span>
                              <div className="flex items-center space-x-2">
                                <div className="w-24 bg-gray-700 rounded-full h-2">
                                  <div 
                                    className="bg-[#4ade80] h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min((userData.readingData.readingGoals.completed / userData.readingData.readingGoals.yearly) * 100, 100)}%` }}
                                  ></div>
                                </div>
                                <span>{Math.round((userData.readingData.readingGoals.completed / userData.readingData.readingGoals.yearly) * 100)}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Presentations Section */}
                {userData.presentationData && userData.presentationData.presentations && userData.presentationData.presentations.length > 0 && (
                  <div className="bg-gray-700 rounded-lg p-4 mt-4">
                    <h4 className="text-sm font-semibold text-white mb-3 flex items-center">
                      <span className="mr-2">🎤</span>
                      Upcoming Presentations
                    </h4>
                    
                    <div className="space-y-3">
                      {userData.presentationData.presentations
                        .filter(presentation => new Date(presentation.date) >= new Date())
                        .slice(0, 3)
                        .map((presentation) => {
                          const daysUntil = Math.ceil((new Date(presentation.date) - new Date()) / (1000 * 60 * 60 * 24));
                          const isUrgent = daysUntil <= 7;
                          const priorityColor = presentation.priority === 'high' ? 'text-red-400' : 
                                              presentation.priority === 'medium' ? 'text-yellow-400' : 'text-green-400';
                          const prepIcon = presentation.preparationStatus === 'completed' ? '✅' :
                                         presentation.preparationStatus === 'in-progress' ? '🔄' : '⏳';
                          
                          return (
                            <div key={presentation.id} className={`p-3 rounded border-l-4 ${
                              presentation.priority === 'high' ? 'border-l-red-500 bg-red-900/20' :
                              presentation.priority === 'medium' ? 'border-l-yellow-500 bg-yellow-900/20' :
                              'border-l-green-500 bg-green-900/20'
                            }`}>
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <h5 className="text-sm font-medium text-white">{presentation.title}</h5>
                                  {presentation.description && (
                                    <p className="text-xs text-gray-400 mt-1">{presentation.description}</p>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2 ml-3">
                                  <span className={`text-xs font-medium ${priorityColor}`}>
                                    {presentation.priority.toUpperCase()}
                                  </span>
                                  <span className="text-xs">{prepIcon}</span>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between text-xs text-gray-400">
                                <div className="flex items-center space-x-3">
                                  <span>📅 {new Date(presentation.date).toLocaleDateString()}</span>
                                  {presentation.time && <span>🕐 {presentation.time}</span>}
                                  {presentation.location && <span>📍 {presentation.location}</span>}
                                </div>
                                <div className={`font-medium ${isUrgent ? 'text-red-400' : 'text-gray-400'}`}>
                                  {daysUntil === 0 ? 'Today' : 
                                   daysUntil === 1 ? 'Tomorrow' : 
                                   `${daysUntil} days`}
                                </div>
                              </div>
                              
                              {presentation.audience && presentation.audience.length > 0 && (
                                <div className="mt-2">
                                  <span className="text-xs text-gray-500">Audience: </span>
                                  <span className="text-xs text-gray-300">
                                    {Array.isArray(presentation.audience) ? presentation.audience.join(', ') : presentation.audience}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      
                      {userData.presentationData.presentations.filter(p => new Date(p.date) >= new Date()).length > 3 && (
                        <div className="text-center">
                          <span className="text-xs text-gray-500">
                            +{userData.presentationData.presentations.filter(p => new Date(p.date) >= new Date()).length - 3} more presentations
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default TeamReport;
