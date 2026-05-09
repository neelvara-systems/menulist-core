# Media Image System

## Purpose

The Media Image System is the shared contract for owner-uploaded and system-created business images across MenuList.

It centralizes:

- image purpose
- allowed formats
- aspect ratios
- upload limits
- output dimensions
- compression budgets
- media identity
- named variants
- focal point metadata
- public rendering expectations

## Current Scope

This system covers:

- menu item images
- project/menu-card images
- menu background images
- business logos
- digital screen custom slides
- business/OBP cover and gallery photos as contract-ready profiles
- AI image shape options for menu item generation

## Navigation

- [Spec](./media-image-system_spec.md)
- [Implementation](./media-image-system_impl.md)
- [Firebase Cost](./media-image-system_firebase.md)
- [Mobile Support](./media-image-system_mobile-support.md)
- [Test Cases](./media-image-system_test-cases.md)
- [Marketing](./media-image-system_marketing.md)
- [Website](./media-image-system_website.md)
- [Help Doc](./media-image-system_helpdoc.md)
- [ChatGPT Review](./_archive/chatgpt-review.md)

## Operating Rule

Images are not generic uploads. Every image saved by MenuList must belong to a known media purpose with a fixed rendering contract.
