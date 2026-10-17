---
title: "Three trends in agentic development"
canonicalSlug: "three-agentic-development-trends"
language: "en"
publishedAt: 2026-10-16
summary: "Managing costs, the search for a new GitHub, and the blurring line between local and cloud environments — three trends in agentic development, plus a question about whether we still need CI."
coverImage: "/blog/three-agentic-development-trends/01.jpg"
coverAlt: "A futuristic city on a slender stalk above a sea of clouds at sunset: white and golden domes and spires, with small shuttles flying between the platforms."
translations:
  en: "three-agentic-development-trends"
  ua: "three-agentic-development-trends"
---
A week ago, before my talk at Tech Summit Fwdays, I was asked about industry trends. So here are three trends in agentic development.

## Trend 1: managing costs

- in the bad case, this means lower individual limits and restricted access to the most powerful models

- in the good case, it means balancing between providers, automatic or semi-automatic choice of model and effort level, smart use of smaller models, decision models and mini-harnesses; making the most of seat-priced subscriptions

I don't buy the pessimists' fear that OpenAI/Anthropic will get everyone hooked on their models and then raise prices - competition has actually pushed them to cut prices in their latest releases. But right now is exactly the right time to approach the cost problem calmly and systematically, so we avoid rushed and unpopular decisions later.

## Trend 2: in search of a new GitHub

We all owe GitHub a deep bow for withstanding the endless stream of commits our agents generate. A bow with a fig in the pocket, though, because zero-nines uptime is not what we expect from a company like GitHub, or from a company like Microsoft. If anyone has all the means and resources, it's them, and yet they haven't delivered on the basic task.

Not to mention the bonus task: what does version control + continuous integration look like in the age of agents?
- who is the author of a commit: a human, an agent, or both together?
- where do the author's prompts and the agent's traces go?
- how should agents talk to each other in a pull request?
- how do we combine local and cloud agent runs?

Lots of questions, and zero expectations from GitHub here.

We'll see plenty of startups like Origin from Cursor - "new GitHubs". I'd keep a close eye on them and start testing them on your pet projects now. For the next year GitHub is still the best home for your code, but sooner or later one of them will crack this puzzle (and it won't be GitHub).

Whoever migrates quickly and correctly gets a huge competitive advantage, and in two or three years GitHub will become a synonym for legacy, like BitBucket or SVN.

## Trend 3: erasing the line between local and cloud

Agents keep stubbornly pulling us toward a unified dev environment across desktop and cloud. We already treat agents as our peers and give them access to the same tools we use ourselves. But how many of your teammates share your computer with you? Have you stopped closing your laptop lid at night so "the agents can work"? It's time to take care of infrastructure that lets every agent spin up its own environment in the cloud that is no different from your own local one.

What does that mean?
- How many new engineers does your team onboard per month? Whatever number you name, it's now dozens and hundreds per day
- The importance of automating onboarding, access permissions and dev environment setup grows by orders of magnitude
- Maybe we'll soon see a tool take off that positions itself as "docker for dev envs"?
- Desktop Linux gets an extra boost: it can be noticeably simpler than spinning up a virtual Mac or Windows in the cloud, and cheaper in terms of a single unified system across desktop and cloud

And finally, the bonus question that ties all three trends together. Isn't CI really just a subtype of a cloud dev environment? Its only role is to run the tests. Although maybe some tests could become more intelligent, agentic - and we already have the environment the agent works in. Is AI code review then just another CI check? And if the agent has already run the tests (and the code review) in its own cloud environment that is identical for all humans and agents, why run it again in CI? Let's not be wasteful - if only GitHub could verify that. And what if all (or some) of the checks already passed locally before the commit? That's completely free (not counting the price of the laptop and electricity).
