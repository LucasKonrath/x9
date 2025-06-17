import React, { useState, useEffect, useRef } from 'react';
import { contributionsQuery, fetchGraphQL } from '../utils/graphql';
import { fetchMarkdownPosts } from '../services/githubService';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import CorporateContributionHeatmap from './CorporateContributionHeatmap';
import GitHubContributionGraph from './GitHubContributionGraph';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

function TeamReport({ users, corporateUsers, onClose }) {
  const [isLoading, setIsLoading] = useState(true);
  const [teamData, setTeamData] = useState([]);
  const [error, setError] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const reportRef = useRef(null);

  const generatePDF = async () => {
    if (!reportRef.current) return;
    
    try {
      setIsGeneratingPDF(true);
      
      // Create a clone of the report for PDF generation
      const reportElement = reportRef.current;
      
      // Configure html2canvas options for better quality
      const canvas = await html2canvas(reportElement, {
        scale: 1.5, // Good balance between quality and file size
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#0f172a',
        width: reportElement.scrollWidth,
        height: reportElement.scrollHeight,
        logging: false, // Disable console logs
      });
      
      const imgData = canvas.toDataURL('image/png');
      
      // Calculate dimensions for a single continuous page
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Create PDF with custom page size to fit all content
      const pdf = new jsPDF('p', 'mm', [210, imgHeight + 50]); // Add 50mm for header
      
      // Add header
      pdf.setFontSize(18);
      pdf.setFont(undefined, 'bold');
      pdf.text('Team Activity Report', 20, 15);
      
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      pdf.text(`Generated on: ${format(new Date(), 'MMMM d, yyyy')}`, 150, 15);
      
      // Add summary stats
      const totalPersonalCommits = teamData.reduce((sum, user) => sum + user.personal2025Contributions, 0);
      const totalCorporateCommits = teamData.reduce((sum, user) => sum + user.corporate2025Contributions, 0);
      
      pdf.setFontSize(12);
      pdf.text(`Team Members: ${teamData.length}`, 20, 25);
      pdf.text(`Total Personal Commits (2025): ${totalPersonalCommits}`, 20, 30);
      pdf.text(`Total Corporate Commits (2025): ${totalCorporateCommits}`, 20, 35);
      
      // Add separator line
      pdf.setLineWidth(0.5);
      pdf.line(20, 40, 190, 40);
      
      // Add the entire content as one image on the custom-sized page
      pdf.addImage(imgData, 'PNG', 0, 45, imgWidth, imgHeight);
      
      // Save the PDF
      const fileName = `team-activity-report-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
      pdf.save(fileName);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  useEffect(() => {
    const fetchTeamData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const userData = await Promise.all(users.map(async (username, index) => {
          // Get corresponding corporate username
          const corporateUser = corporateUsers[index];
          
          // Fetch personal contributions
          const now = new Date();
          const fromDate = new Date(now);
          fromDate.setFullYear(fromDate.getFullYear() - 1);

          const personalData = await fetchGraphQL(contributionsQuery, {
            username,
            from: fromDate.toISOString(),
            to: now.toISOString()
          }, true);

          // Fetch corporate contributions
          const corporateData = await fetchGraphQL(contributionsQuery, {
            username: corporateUser,
            from: '2025-01-01T00:00:00Z',
            to: now.toISOString()
          }, false);

          // Fetch latest meeting notes
          const markdownPosts = await fetchMarkdownPosts(username);
          const latestNote = markdownPosts.length > 0 ? markdownPosts[0] : null;

          // Calculate 2025 contributions
          const personal2025Contributions = personalData.data.user.contributionsCollection.contributionCalendar.weeks
            .reduce((sum, week) => sum + week.contributionDays
              .reduce((daySum, day) => daySum + (day.date.startsWith('2025') ? day.contributionCount : 0), 0), 0);

          const corporate2025Contributions = corporateData.data.user.contributionsCollection.contributionCalendar.weeks
            .reduce((sum, week) => sum + week.contributionDays
              .reduce((daySum, day) => daySum + (day.date.startsWith('2025') ? day.contributionCount : 0), 0), 0);

          return {
            username,
            corporateUser,
            personal2025Contributions,
            corporate2025Contributions,
            latestNote
          };
        }));

        setTeamData(userData);
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
            {teamData.map((userData) => (
              <div
                key={userData.username}
                className="bg-[#0f172a] border border-[#334155] rounded-lg p-4"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold text-white">
                    {userData.username}
                  </h3>
                  <div className="flex gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Personal Commits (2025)</p>
                      <p className="text-lg font-medium text-[#4ade80]">
                        {userData.personal2025Contributions}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Corporate Commits (2025)</p>
                      <p className="text-lg font-medium text-[#4ade80]">
                        {userData.corporate2025Contributions}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4 mb-4">
                  <div className="w-full">
                    <p className="text-sm text-gray-400 mb-2">Personal Contributions</p>
                    <GitHubContributionGraph 
                      username={userData.username} 
                      minimal={true} 
                    />
                  </div>
                  <div className="w-full">
                    <p className="text-sm text-gray-400 mb-2">Corporate Contributions</p>
                    <CorporateContributionHeatmap 
                      corporateUser={userData.corporateUser}
                      minimal={true} 
                    />
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default TeamReport;
