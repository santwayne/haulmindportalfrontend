import  { useState } from 'react';
import {  Filter,  MapPin,  Settings, BarChart3, FileText, History, Search, X, ChevronDown } from 'lucide-react';

const TripHistory = () => {
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('Today');
  const [includeArchived, setIncludeArchived] = useState(true);
  const [excludeStops, setExcludeStops] = useState('Under');
  const [stopDuration, setStopDuration] = useState('5');
  const [overStopDuration, setOverStopDuration] = useState('5');
  const [selectedGroup, setSelectedGroup] = useState('All Groups');
  const [searchTerm, setSearchTerm] = useState('');

  // Sample trip data matching the new format
  const tripData = [
    {
      id: 'Mon Nov 20 001-EL-BMW-(GO9)',
      date: 'Mon Nov 20',
      vehicle: '001-EL-BMW-(GO9)',
      totalStopDuration: '22h19m',
      totalDrivingDuration: '1h41m',
      totalIdlingDuration: '3m7s',
      totalDistance: '42MI',
      activities: [
        {
          type: 'Driving',
          icon: '🚗',
          time: '8:44pm-8:59am',
          stopDuration: '12h5m',
          idling: '0s'
        },
        {
          type: 'Stopped',
          icon: '⏹️',
          time: '8:44pm-8:59am', 
          stopDuration: '12h5m',
          idling: '0s'
        }
      ]
    }
  ];

  const datePeriodOptions = [
    'Today', 'Yesterday', 'This Week', 'Last Week', 
    'This Month', 'Last Month', 'Custom'
  ];

  const reportFormats = [
    { name: 'Standard', icon: FileText },
    { name: 'Advanced', icon: BarChart3 },
    { name: 'Progress Report', icon: History },
    { name: 'Trip Categorization Report', icon: Filter },
    { name: 'Trips History With Odometer', icon: MapPin }
  ];

  const handleApplyChanges = () => {
    setShowOptionsModal(false);
    console.log('Applied changes with current settings');
  };

  const handleDownload = (format:any, type = 'pdf') => {
    setShowReportModal(false);
    console.log(`Downloading ${format} as ${type}`);
  };

  const OptionsModal = () => (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm  z-50 flex items-center justify-center">
      <div className="bg-card rounded-lg shadow-lg w-96 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Display Options</h3>
          <button onClick={() => setShowOptionsModal(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Data Period Section */}
          <div>
            <h4 className="font-medium text-primary mb-3">Data Period</h4>
            <div className="space-y-2">
              {datePeriodOptions.map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`w-full text-left px-3 py-2 rounded transition-colors ${
                    selectedPeriod === period 
                      ? 'bg-purple-100 text-purple-700 border border-purple-300' 
                      : 'hover:bg-[rgba(255,255,255,0.03)] text-primary'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          {/* Display Options */}
          <div className="space-y-4">
            <h4 className="font-medium text-primary">Display Settings</h4>
            
            {/* Include Archived Data */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-primary">Include Archived (Historical) Data</span>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-secondary">On</span>
                <button
                  onClick={() => setIncludeArchived(!includeArchived)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    includeArchived ? 'bg-purple-600' : 'bg-gray-300'
                  }`}
                >
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-card transition-transform ${
                    includeArchived ? 'translate-x-5' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>

            {/* Exclude Stops */}
            <div className="space-y-2">
              <label className="text-sm text-primary">Exclude Stops</label>
              <div className="flex items-center space-x-4">
                <select
                  value={excludeStops}
                  onChange={(e) => setExcludeStops(e.target.value)}
                  className="text-xs border border-theme rounded px-2 py-1"
                >
                  <option>Under</option>
                  <option>Over</option>
                </select>
                <input
                  type="number"
                  value={stopDuration}
                  onChange={(e) => setStopDuration(e.target.value)}
                  className="w-16 text-xs border border-theme rounded px-2 py-1"
                />
                <span className="text-xs text-secondary">Minutes</span>
              </div>
            </div>

            {/* Over Duration */}
            <div className="space-y-2">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-primary">Over</span>
                <input
                  type="number"
                  value={overStopDuration}
                  onChange={(e) => setOverStopDuration(e.target.value)}
                  className="w-16 text-xs border border-theme rounded px-2 py-1"
                />
                <span className="text-xs text-secondary">Minutes</span>
              </div>
            </div>

            {/* Trip Categories */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-primary">Trip Categories</span>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-secondary">Show</span>
                <span className="text-xs bg-gray-200 text-secondary px-2 py-1 rounded">Hide</span>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => setShowOptionsModal(false)}
              className="flex-1 bg-gray-200 text-primary py-2 px-4 rounded hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyChanges}
              className="flex-1 bg-purple-600 !text-white py-2 px-4  !ml-3 rounded hover:bg-purple-700 transition-colors"
            >
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const ReportModal = () => (
    <div className="fixed inset-0  bg-gray-900/50 backdrop-blur-sm  z-50 flex items-center justify-center">
      <div className="bg-card rounded-lg shadow-lg w-96">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Prepare For Download</h3>
          <button onClick={() => setShowReportModal(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="mb-4">
            <h4 className="text-sm font-medium text-primary mb-3">Report Formats</h4>
            <div className="space-y-3">
              {reportFormats.map((format, index) => {
                const IconComponent = format.icon;
                return (
                  <div key={index} className="flex items-center justify-between p-2 hover:bg-[rgba(255,255,255,0.03)] rounded">
                    <div className="flex items-center space-x-2">
                      <IconComponent className="h-4 w-4 text-secondary" />
                      <span className="text-sm text-primary">{format.name}</span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDownload(format.name, 'pdf')}
                        className="text-xs bg-red-600 !text-white !mr-3 px-2 py-1 rounded hover:bg-red-700"
                      >
                        PDF
                      </button>
                      <button
                        onClick={() => handleDownload(format.name, 'browser')}
                        className="text-xs bg-blue-600 !text-white px-2 py-1 rounded hover:bg-blue-700"
                      >
                        Browser
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const SummaryView = () => (
    <div className="bg-card rounded-lg shadow-sm border mt-6">
      <div className="px-6 py-4 border-b border-theme">
        <h2 className="text-lg font-semibold text-primary">
          Activity and Trips Summary Report
        </h2>
      </div>
      
      <div className="p-6">
        {tripData.map((trip) => (
          <div key={trip.id} className="mb-6">
            <h3 className="text-lg font-medium text-primary mb-4">{trip.id}</h3>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 w-32">
                  <div className="w-3 h-3 rounded bg-red-400"></div>
                  <span className="text-sm font-medium text-primary">Idling</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <div className="h-4 rounded-full bg-red-400" style={{width: '30%'}}></div>
                    <span className="text-sm text-secondary">{trip.totalIdlingDuration}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 w-32">
                  <div className="w-3 h-3 rounded bg-green-400"></div>
                  <span className="text-sm font-medium text-primary">On Trip Stopped</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <div className="h-4 rounded-full bg-green-400" style={{width: '40%'}}></div>
                    <span className="text-sm text-secondary">{trip.totalStopDuration}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 w-32">
                  <div className="w-3 h-3 rounded bg-blue-400"></div>
                  <span className="text-sm font-medium text-primary">Tracking</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <div className="h-4 rounded-full bg-blue-400" style={{width: '60%'}}></div>
                    <span className="text-sm text-secondary">{trip.totalDrivingDuration}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline visualization */}
            <div className="mt-4 relative">
              <div className="h-6 bg-gray-200 rounded-lg overflow-hidden flex">
                <div className="bg-red-400 h-full" style={{width: '10%'}}></div>
                <div className="bg-green-400 h-full" style={{width: '70%'}}></div>
                <div className="bg-blue-400 h-full" style={{width: '20%'}}></div>
              </div>
              <div className="flex justify-between text-xs text-secondary mt-1">
                <span>Start</span>
                <span>End</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-card p-6">
      <div className="max-w-7xl mx-auto">
        {/* Top Navigation Bar */}
        <div className="bg-card rounded-lg shadow-sm border mb-6">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Search By Trip */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary" />
                <input
                  type="text"
                  placeholder="Search By Trip"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <Settings className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary" />
              </div>

              {/* Filter By Group */}
              <div className="relative">
                <select 
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="appearance-none bg-card border border-theme rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option>Filter By Group</option>
                  <option>All Groups</option>
                  <option>Group A</option>
                  <option>Group B</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary" />
              </div>

              {/* Options */}
              <button 
                onClick={() => setShowOptionsModal(true)}
                className="flex items-center space-x-1 px-4 py-2 border !mr-3 border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)]"
              >
                <span>Options</span>
                <ChevronDown className="h-4 w-4" />
              </button>

              {/* Summary */}
              <button 
                onClick={() => setShowSummary(!showSummary)}
                className="px-4 py-2 border !mr-3 border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)]"
              >
                Summary
              </button>

         

              {/* Report */}
              <div className="relative">
                <button 
                  onClick={() => setShowReportModal(true)}
                  className="flex items-center space-x-1 px-4 py-2 border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)]"
                >
                  <span>Report</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Show All Trips */}
            <button className="flex items-center space-x-2 bg-gray-800 !text-white px-4 py-2 rounded-lg hover:bg-gray-900">
              <span>Show All Trips</span>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-card rounded"></div>
                <div className="w-2 h-2 bg-card rounded"></div>
              </div>
            </button>
          </div>
        </div>

        {/* Trip History List */}
        <div className="space-y-4">
          {tripData.map((trip) => (
            <div key={trip.id} className="bg-card rounded-lg shadow-sm border">
              {/* Trip Header */}
              <div className="bg-purple-500 text-white px-6 py-3 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{trip.id}</h3>
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="flex items-center space-x-2">
                      <span>Total Stop Duration</span>
                      <span className="font-medium">{trip.totalStopDuration}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span>Total Driving Duration</span>
                      <span className="font-medium">{trip.totalDrivingDuration}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span>Total Idling Duration</span>
                      <span className="font-medium">{trip.totalIdlingDuration}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span>Total Distance</span>
                      <span className="font-medium">{trip.totalDistance}</span>
                    </div>
                    {/* <button className="bg-card text-primary px-3 py-1 rounded text-sm font-medium hover:bg-[rgba(255,255,255,0.03)]">
                      Show Trips
                      <div className="inline-flex ml-2 space-x-1">
                        <div className="w-1 h-1 bg-gray-800 rounded"></div>
                        <div className="w-1 h-1 bg-gray-800 rounded"></div>
                      </div>
                    </button> */}
                  </div>
                </div>
              </div>

              {/* Trip Details */}
              <div className="px-6 py-4">
                <div className="space-y-3">
                  {trip.activities.map((activity, index) => (
                    <div key={index} className="grid grid-cols-6 gap-4 py-2 border-b border-theme last:border-b-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{activity.icon}</span>
                      </div>
                      <div className="font-medium text-primary">{activity.type}</div>
                      <div className="text-secondary">{activity.time}</div>
                      <div className="text-secondary">Stop Duration</div>
                      <div className="text-secondary">{activity.stopDuration}</div>
                      <div className="text-secondary">Idling</div>
                      <div></div>
                      <div></div>
                      <div></div>
                      <div></div>
                      <div></div>
                      <div className="text-secondary">{activity.idling}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary View */}
        {showSummary && <SummaryView />}

        {/* Modals */}
        {showOptionsModal && <OptionsModal />}
        {showReportModal && <ReportModal />}
      </div>
    </div>
  );
};

export default TripHistory;