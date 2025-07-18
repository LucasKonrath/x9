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
      
      // Configure html2canvas options for smaller file size
      const canvas = await html2canvas(reportElement, {
        scale: 0.8, // Reduced scale for smaller file size
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#0f172a',
        width: reportElement.scrollWidth,
        height: reportElement.scrollHeight,
        logging: false, // Disable console logs
        quality: 0.7, // Reduce image quality
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.7); // Use JPEG with 70% quality
      
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
            latestNote,
            reinforcements,
            readingData
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
                      minimal={false} 
                    />
                  </div>
                  <div className="w-full">
                    <p className="text-sm text-gray-400 mb-2">Corporate Contributions</p>
                    <CorporateContributionHeatmap 
                      corporateUser={userData.corporateUser}
                      minimal={false} 
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
                        {userData.readingData.readingGoals.completed}/{userData.readingData.readingGoals.yearly} books (2025)
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default TeamReport;
