/*
 * This file is part of x3lanix-launcher (https://github.com/CCBlueX/x3lanix-launcher)
 *
 * Copyright (c) 2015 - 2024 CCBlueX
 *
 * x3lanix-launcher is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * x3lanix-launcher is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with x3lanix-launcher. If not, see <https://www.gnu.org/licenses/>.
 */

use anyhow::Result;
use sha1::{Digest, Sha1};
use std::path::PathBuf;

pub fn sha1sum(path: &PathBuf) -> Result<String> {
    let hash = Sha1::digest(std::fs::read(path)?);
    Ok(base16ct::lower::encode_string(&hash))
}
