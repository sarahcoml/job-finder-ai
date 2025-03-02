"use client";

import { useState } from "react";

export default function Home() {
  const [jobTitle, setJobTitle] = useState("");
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);

  const searchJobs = async () => {
    if (!jobTitle) {
      alert("Please enter a job title");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/jobs?title=${encodeURIComponent(jobTitle)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      setJobs(data);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      alert("Failed to fetch jobs.");
    }

    setLoading(false);
  };

  return (
    <div className="container mt-4">
      <h1>Carly's Job Finder</h1>
      <div className="input-group my-3">
        <input
          type="text"
          placeholder="Enter job title..."
          className="form-control"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
        />
        <button onClick={searchJobs} className="btn btn-primary" disabled={loading}>
          {loading ? "Searching..." : "Search Jobs"}
        </button>
      </div>

      {jobs.length > 0 && (
        <ul className="list-group">
          {jobs.map((job: any, index) => (
            <li key={index} className="list-group-item">
              <h5>{job.title}</h5>

              <span className="badge bg-secondary me-2">🏢 {job.company}</span>
              <span className="badge bg-info text-dark me-2">⏳ {job.posted}</span>
              <span className={`badge ${job.source === "LinkedIn" ? "bg-primary" : "bg-success"}`}>
                🌐 {job.source}
              </span>

              <br />
              <a href={job.link} target="_blank" className="btn btn-sm btn-outline-primary mt-2">
                View Job
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}