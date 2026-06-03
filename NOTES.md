I am bringing some features and concepts from another app into this application to enhance it:
1. job Application Hub – this concept makes the Job Application model a central integral part of the project-app. a job application is made up of 4 main entities:
- Job listing details(_id,job title, company, salary, job description, posted date, location, key requirements & skill required etc.),
-  CV(_id, CV as JSON code, CV uploaded date etc.),
-  Cover letter(_id, Cover letter as JSON code, key points from Profile and Job description used to generate cover letter, isAIGenerated, isUserEdited, updatedAt etc.),
-  User Profile (user_id,name,contact details, Salary Expectations, Available Start Date & notice period, and other preferences, etc.). @/src/lib/applications contains some of the code to allow the job applications to function as intended. @/src/app/applications contains the page.ts (interface) 

2. @/src/app/profile/ & @/src/lib/profile/  – these 2 directory holds the layout and functional code of the profile page. this existing app already contains a powerful CV scanner. We should also use this CV scanner to extract information from the CV to richly populate the User Profile further with minimum effort for the user (if profile already 100% ask user if they would like to update profile with new information from scan). We must first implement thorough User Authentication.  

3. Cover Letter Generator @/src/lib/application – This cover letter generator is prefered because it takes information from both the job description and the User profile to create a custom Cover letter. it is essential to merge this code into this application.Cover letter Merge animation– to be used when the cover letter and job description are being merged into. @/src/components/ui/cover-letter-merge-animation.tsx

4. SAves Search – Allows users to save their job search queries for future use
