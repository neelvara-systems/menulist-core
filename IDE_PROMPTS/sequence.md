> **⚠️ DEPRECATED — February 21, 2026**
> All unique content from this file has been merged into `IDE_PROMPTS/MASTER-EXECUTION-PROMPT.md`:
>
> - ChatGPT conversation → doc phase → STEP 1B (ChatGPT Input Protocol) + Stage 0-1
> - Implementation mindset + doc reading order → Stage 2 (Implementation Principles)
> - "Never invent behavior outside docs" → Stage 2 (Implementation Principles)
> - "If ambiguity → safest deterministic behavior" → Stage 2 (Implementation Principles)
> - Post-doc recheck → Stage 4 (Parity + Simulation)
> - After implementation cross-checks → STEP 7 (Session Lifecycle, 8 phases)
> - ChatGPT feedback handling → Stage 3 (code-feedback / doc-feedback auto-routing)
> - Knowledge preservation from chat → STEP 7 Phase 7
>
> **Use the Master Prompt instead.** This file is kept for historical reference only.

---

## A. Starting

1. okay so now we are going to start working on very huge major core feature: whatsapp onboarding
2. for this i had deep discussion with chatgpt im going to share you this whole discussion
3. go through it carefuuly without missing any single line
4. in this discussion we discussed multiple flows idea approach and planning
5. but now i need your experties and knowledge about the menulist here,
   since chatgpt dont have full knoeldge and context about menulist and this whole codebase and architecture we discussed approches approximate flow and data flow and data structure so you need to revalidate each and evry step deeply and validate against menulist
6. if you need to do web search then do it for this feature
7. if you find anything that we missed in this flow then you must add it
8. at the end your thought and your decision is most important since you have whole system access and context that chatgpt dont have
9. make sure this is document phase so don not touch codechanges now
   once you created all the document we will review and then start implimentation
10. follow appropriate prompt for this step /help
11. /new-feature
12. @00. MASTER RULES & WORKFLOW.md and use necessary prompt from @IDE_PROMPTS
13. do not assume anything from codebase context check veryfy and then take decision
14. in any case you need to decide somthing then dont wait for me you decide but make sure you logged it carefully with reason what why how way so that i'll get to know
15. this is mostly everything firebase function side logic so first check how we are writing logics in firebase functions then study it then apply the same or better approach you have
16. this is very huge feature as well converstion i shared is also very watse so cross check evrything at the end line by line each doc
17. revalidate evrything against the conversastion against menulist against decision you made and if needed do web search
18. since you know how menu extraction onboarding happening in current system so refer it if needed @**docs**/projects/ai-data-extraction @**docs**/onboarding

## START OF CHATGPT CONVERSATION

## END OF CHATGPT CONVERSATION

## A.2 Post doc recheck

Must follow @00. MASTER RULES & WORKFLOW.md

1. now do deep dive on what is we convered and what is possibilities to happened
   and what is the resolutions
2. also now i want you to think like end user do dry run workflow and check is current documented workflow is good and perfect for scale and performance as well as usability
3. now do deep dive and identify gap that we need to fix or consider while processing this since we are building this long term 10 year freeze architecture so no single mistake/assumtptions acceptable make this workflow docs full future proof
4. Now do deep review of each and every document you have created and cross check the whole conversastion/cascade again and cross check you didnt miss any step/flow/usecase
5. do deep audit for workflow based on docs and check you have logged each and evry use case evry step evrything in docs without assuming without guessing
6. do check deeply that is there any scope for improvemnt left if yes then do update the docs for better approach if any you found
7. this onboarding flow is very critical and important 0.1% also not accpetable so by considering this do final review and cross checking for each and evry file of doc you have created for this feature

## B. start implimentation

Must follow @00. MASTER RULES & WORKFLOW.md

1. okay then now we will begin with the development of this feature so sollow all the docs and impliment everything carefully one by one but without affecting existing implimentation and flows
2. no phases need to build evrything in one go
3. do the changes for evrything from sratch carefully
4. after done update docs accordingly
5. follow this /new-feature
6. then after complition of implimentation follow this /final-review
7. after evrything done follow this /doc-rebuild if needed becuase while doing code changes if you done which is imp and which is not mentioned in the doc, then do update docs too

## C. after implimentation

Must follow @00. MASTER RULES & WORKFLOW.md

1. have you updated all the releted docs becuase im saying so many information in this cascade chat session which is really helpfull
   if we change cascade then it will get removed so do one thing if anything important in future like explaining things or our decision that why we made in this way what how then log this infi also in docs
2. and in future this all feature docs including each and evry file is single source of truth for us so we dont compromise on docs coverability and quality and truthfullness
   so do cross check evrything and do the needfull
3. now cross check evrything against doc
4. now cross check evrything against cascade
5. deeply check is evrything aligne with existing system
6. do cross check each and evry doc is updated
7. follow each workflow one by one single at a time for this feature and whatever we have build for this
8. /final-review
9. /new-feature
10. /review this feature

## D. chatgpt feedback on implimentation

Must follow @00. MASTER RULES & WORKFLOW.md

1. so i share this whole implimentation docs @**docs**/pos-webhook-sync to chagpt then he gave me this below feedback check it do the changes if needed in codebase as well as doc
2. and also there he added some content which i feel usefull for marketing/website.sales purpose not implimentation but other than coding changes is usefull so if you feel you can add or update or this related docs with this insights :
3. follow /code-feedback

## START OF CHATGPT FEEDBACK

## END OF CHATGPT FEEDBACK

## IMPLIMENTATION START :

Now We will start the impimentation for this feature
Do follow carefully as we follow for other feature implimenation phase

1. You are implementing a production-grade messaging onboarding infrastructure inside an existing SaaS codebase (MenuList).
   This is NOT an experiment.
   NOT a prototype.
   NOT a quick feature.
   This must be built as long-term infrastructure that will run for 5+ years without redesign.
   Read all instructions carefully and follow them strictly.

2. CONTEXT
   We are implementing:
   Messaging Onboarding — Zero-Friction SMB Acquisition Engine
   This system allows SMB owners to send menu images/PDF via messaging apps (WhatsApp first), automatically extracts and structures menu data using existing Gemini pipeline, generates preview, and publishes a live MenuList presence.
   The messaging tunnel closes permanently after publish.
   This is an acquisition infrastructure, not chat support, not CRM, not bot.
   Full documentation already exists and is implementation-ready.
   You must strictly follow documentation.

3. DOCUMENTATION ENTRY POINT
   Start from:
   README.md (Messaging Onboarding Documentation Hub)
   Then read in this order:
   \_impl.md → PRIMARY SOURCE OF TRUTH
   \_spec.md → user flow + invariants
   \_firebase.md → cost discipline
   \_test-cases.md → behavioral expectations
   and other related docs if needed from @**docs**
   Never invent behavior outside docs.
   If ambiguity exists:
   choose the safest deterministic behavior.

4. no phases need to build evrything in one go
5. after done update docs accordingly
6. follow this /new-feature
7. then after complition of implimentation follow this /final-review

Must follow @00. MASTER RULES & WORKFLOW.md
choose correct workflow('s) for this implimentation phase : /help
