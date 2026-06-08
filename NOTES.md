I am bringing some features and concepts from another app into this application to enhance it:
1. job Application Hub – this concept makes the Job Application model a central integral part of the project-app. a job application is made up of 4 main entities:
- Job listing details(_id,job title, company, salary, job description, posted date, location, key requirements & skill required etc.),
-  CV(_id, CV as JSON code, CV uploaded date etc.),
-  Cover letter(_id, Cover letter as JSON code, key points from Profile and Job description used to generate cover letter, isAIGenerated, isUserEdited, updatedAt etc.),
-  User Profile (user_id,name,contact details, Salary Expectations, Available Start Date & notice period, and other preferences, etc.). @/src/lib/applications contains some of the code to allow the job applications to function as intended. @/src/app/applications contains the page.ts (interface) 

2. @/src/app/profile/ & @/src/lib/profile/  – profile layout and services. **ATS Resume Analyzer** (`/dashboard/resume`) is for scoring only — it does **not** update the profile. **Profile pre-fill** on `/dashboard/profile`: URL import (unchanged), upload CV in the CV File section then **Use uploaded CV**, or **Use latest resume scan** — always preview → Apply → Save. Auth is Supabase (Wave 1).  

3. Cover Letter Generator @/src/lib/application – This cover letter generator is prefered because it takes information from both the job description and the User profile to create a custom Cover letter. it is essential to merge this code into this application. **Merge animation** runs on application detail when the user clicks Generate/Regenerate with AI (`ApplicationLetterEditor` → `cover-letter-merge-animation.tsx`).

4. SAves Search – Allows users to save their job search queries for future use

5. (New Feature) TinderSwipe apply for mobile premium users – Allow mobile users to apply or reject job listing that match their profile with a simple swipe left or right. Accept swipe would automatically, run a ATS report, generate cover letter (From user profile + JD + ATS Report) & customize CV (when feature is ready) and apply for the job on the jobs listings native webpage, then save the application details in Application List as "applied". will only be available for positions that actually match the user profile to avoid spam applications from unqualified candidates. 

6. Admin Pannel to show platform stats


04.06.2026–unaddressed notes: 
- we should not Use latest ATS resume scan To Populate User Profile at all. currently the option is still there on Profile. 
- Make sure the application ATS report is used to influence the Cover letter Generator in creating the perfect Cover letter
- 