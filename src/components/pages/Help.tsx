import GlobalNav from '../GlobalNav';
import { HelpCircle, Book, Video, MessageCircle, Search, ExternalLink } from 'lucide-react';
import { useState } from 'react';

interface HelpProps {
  onLogout: () => void;
  currentOffice: string;
  setCurrentOffice: (office: string) => void;
}

export default function Help({ onLogout, currentOffice, setCurrentOffice }: HelpProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const helpTopics = [
    {
      category: 'Getting Started',
      articles: [
        { title: 'Quick Start Guide', views: 1245 },
        { title: 'Setting Up Your Practice', views: 892 },
        { title: 'Adding Your First Patient', views: 756 },
        { title: 'Creating Appointments', views: 643 },
      ]
    },
    {
      category: 'Patient Management',
      articles: [
        { title: 'Managing Patient Records', views: 567 },
        { title: 'Insurance Information', views: 445 },
        { title: 'Patient Communication', views: 389 },
        { title: 'Medical History', views: 312 },
      ]
    },
    {
      category: 'Billing & Payments',
      articles: [
        { title: 'Creating Invoices', views: 678 },
        { title: 'Processing Payments', views: 534 },
        { title: 'Insurance Claims', views: 467 },
        { title: 'Payment Plans', views: 356 },
      ]
    },
    {
      category: 'Reports',
      articles: [
        { title: 'Financial Reports', views: 423 },
        { title: 'Production Reports', views: 389 },
        { title: 'Patient Analytics', views: 298 },
        { title: 'Custom Reports', views: 267 },
      ]
    },
  ];

  const videos = [
    { title: 'Introduction to Dental PMS', duration: '5:32', thumbnail: '🎥' },
    { title: 'Scheduling Best Practices', duration: '8:15', thumbnail: '🎥' },
    { title: 'Charting Tutorial', duration: '12:45', thumbnail: '🎥' },
    { title: 'Billing Workflow', duration: '9:20', thumbnail: '🎥' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <GlobalNav 
        onLogout={onLogout} 
        currentOffice={currentOffice}
        setCurrentOffice={setCurrentOffice}
      />
      
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <HelpCircle className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-gray-900">Help Center</h1>
            <p className="text-gray-600">Find answers and learn how to use the system</p>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search for help articles, tutorials, and more..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Help Articles */}
          <div className="lg:col-span-2 space-y-6">
            {helpTopics.map((topic, topicIndex) => (
              <div key={topicIndex} className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <Book className="w-5 h-5 text-blue-600" />
                    <h2 className="text-gray-900">{topic.category}</h2>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {topic.articles.map((article, articleIndex) => (
                      <button
                        key={articleIndex}
                        className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors text-left group"
                      >
                        <div className="flex items-center gap-3">
                          <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                          <div>
                            <div className="text-gray-900 group-hover:text-blue-600">{article.title}</div>
                            <div className="text-gray-600">{article.views} views</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Video Tutorials */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <Video className="w-5 h-5 text-blue-600" />
                  <h2 className="text-gray-900">Video Tutorials</h2>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {videos.map((video, index) => (
                    <button
                      key={index}
                      className="w-full p-4 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors text-left group"
                    >
                      <div className="flex gap-3">
                        <div className="text-3xl">{video.thumbnail}</div>
                        <div className="flex-1">
                          <div className="text-gray-900 group-hover:text-blue-600 mb-1">
                            {video.title}
                          </div>
                          <div className="text-gray-600">{video.duration}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Contact Support */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-blue-600" />
                  <h2 className="text-gray-900">Contact Support</h2>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <div className="text-gray-600 mb-1">Phone Support</div>
                    <div className="text-gray-900">1-800-DENTAL-PMS</div>
                    <div className="text-gray-600">Mon-Fri, 8am-6pm EST</div>
                  </div>
                  <div>
                    <div className="text-gray-600 mb-1">Email Support</div>
                    <div className="text-gray-900">support@dentalpms.com</div>
                  </div>
                  <button className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Start Live Chat
                  </button>
                </div>
              </div>
            </div>

            {/* System Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-gray-900 mb-4">System Information</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Version</span>
                  <span className="text-gray-900">4.2.1</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Updated</span>
                  <span className="text-gray-900">Mar 15, 2024</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">License</span>
                  <span className="text-gray-900">Enterprise</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
